require('./testEnvironment.cjs').configureTestEnvironment();
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const prisma = require('../prismaClient');
const reminderService = require('../services/appointmentReminderService');
reminderService.scanDueAppointmentReminders = async () => [];
async function main() {
  const suffix = randomUUID();
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  assert.ok(staff);
  const helper = await prisma.user.create({ data: { username: 'workflow-' + suffix, password: 'not-a-login-hash', role: 'STAFF' } });
  const student = await prisma.user.create({ data: { username: 'student-' + suffix, password: 'not-a-login-hash', role: 'STUDENT' } });
  const p = await prisma.patient.create({ data: { name: 'Workflow verification', patientId: 'CHECK-' + suffix, dob: new Date('2016-01-01') } });
  const other = await prisma.patient.create({ data: { name: 'Conflict verification', patientId: 'CHECK-OTHER-' + suffix } });
  const app = express(); app.use(express.json());
  app.use('/clinical', require('../routes/clinicalRoutes'));
  app.use('/patient', require('../routes/patientRoutes'));
  app.use('/appointment', require('../routes/appointmentRoutes'));
  app.use('/radiograph', require('../routes/radiographRoutes'));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  async function request(route, method = 'GET', body, user = staff) {
    const headers = { Authorization: 'Bearer ' + jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(origin + route, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, data };
  }
  const clinical = '/clinical/' + p.id;
  try {
    assert.equal((await fetch(origin + clinical)).status, 401);
    assert.equal((await request(clinical, 'GET', null, student)).status, 403);
    const plan = { kind: 'TREATMENT_PLAN', data: { diagnosis: 'Test diagnosis', objectives: 'Test objective', appliance: 'Fixed', plan: 'Test plan' } };
    assert.equal((await request(clinical, 'POST', plan, student)).status, 403);
    await prisma.patientAccess.create({ data: { userId: student.id, patientId: p.id, grantedBy: staff.id } });
    assert.equal((await request(clinical, 'GET', null, student)).status, 200);
    assert.equal((await request('/radiograph/patient/' + other.id, 'GET', null, student)).status, 403);
    let result = await request(clinical, 'POST', plan); assert.equal(result.status, 201, JSON.stringify(result.data));
    const first = result.data;
    assert.equal((await request(clinical + '/' + first.id + '/approve', 'POST')).status, 200);
    result = await request(clinical, 'POST', { ...plan, previousId: first.id, data: { ...plan.data, objectives: 'Revised objective' } });
    assert.equal(result.status, 201); assert.equal(result.data.version, 2);
    assert.equal((await request(clinical, 'POST', { ...plan, previousId: first.id })).status, 409);
    assert.equal((await request(clinical + '/' + first.id + '/approve', 'POST')).status, 409);
    assert.equal((await request(clinical + '/' + result.data.id + '/approve', 'POST')).status, 200);
    assert.equal((await request(clinical, 'POST', { kind: 'VISIT', data: { date: '2026-09-24', findings: 'Reviewed', procedures: 'Adjusted', nextAction: 'Review' } })).status, 201);
    const consent = { kind: 'CONSENT', data: { decision: 'Granted', scope: 'Treatment', signedDate: '2026-09-24', signer: 'Test guardian', signerRole: 'Parent / guardian', relationship: 'Parent' } };
    assert.equal((await request(clinical, 'POST', consent)).status, 400);
    const form = new FormData(); form.append('payload', JSON.stringify(consent)); form.append('document', new Blob(['%PDF-1.4\nSynthetic test fixture\n%%EOF'], { type: 'application/pdf' }), 'test-consent.pdf');
    result = await request(clinical, 'POST', form); assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.hasDocument, true); assert.equal('documentFile' in result.data, false);
    assert.equal((await request(clinical + '/' + result.data.id + '/document')).status, 200);
    assert.equal((await request('/clinical/' + other.id + '/' + result.data.id + '/document')).status, 404);
    for (const entry of [
      { kind: 'RETENTION', data: { completionDate: '2026-09-24', retainer: 'Test retainer', instructions: 'Test wear instructions', reviewDate: '2026-10-24' } },
      { kind: 'DISCHARGE', data: { date: '2026-09-24', outcomes: 'Recorded outcomes', reason: 'Completed', advice: 'Continue review' } }
    ]) assert.equal((await request(clinical, 'POST', entry)).status, 201);
    assert.equal((await prisma.patient.findUnique({ where: { id: p.id } })).status, 'Discharged');
    const date = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
    const booking = { patientId: p.id, clinicianId: helper.id, date, time: '10:00', type: 'adjustment', duration: '30min' };
    result = await request('/appointment/register', 'POST', booking); assert.equal(result.status, 201, JSON.stringify(result.data));
    const appointment = result.data;
    assert.equal((await request('/appointment/register', 'POST', { ...booking, time: '10:15' })).status, 409);
    assert.equal((await request('/appointment/register', 'POST', { ...booking, patientId: other.id })).status, 409);
    assert.equal((await request('/appointment/register', 'POST', { ...booking, clinicianId: staff.id })).status, 409);
    assert.equal((await request('/appointment/register', 'POST', { ...booking, time: '10:30' })).status, 201);
    assert.equal((await request('/appointment/' + appointment.id + '/reschedule', 'PATCH', { ...booking, time: '10:45' })).status, 409);
    await prisma.appointment.update({ where: { id: appointment.id }, data: { patientEmailStatus: 'Sent', clinicianEmailStatus: 'Sent', patientReminderSentAt: new Date(), clinicianReminderSentAt: new Date() } });
    result = await request('/appointment/' + appointment.id + '/reschedule', 'PATCH', { ...booking, time: '12:00' }); assert.equal(result.status, 200);
    assert.equal(result.data.patientEmailStatus, 'Pending'); assert.equal(result.data.patientReminderSentAt, null);
    assert.equal((await request('/appointment/' + appointment.id + '/status', 'PATCH', { status: 'Missed' })).status, 400);
    const race = await Promise.all([p, other].map(patient => request('/appointment/register', 'POST', { ...booking, patientId: patient.id, time: '15:00' })));
    assert.deepEqual(race.map(item => item.status).sort(), [201, 409]);
    assert.equal((await request('/patient/' + p.id, 'PUT', { notes: 'Audit verification' })).status, 200);
    const audit = await prisma.historyLog.findFirst({ where: { patientId: p.id, action: 'Patient Updated' }, orderBy: { id: 'desc' } });
    assert.equal(audit.actorId, staff.id); assert.equal(audit.changes.after.notes, 'Audit verification');
    assert.equal((await request('/patient/' + p.id + '/archive', 'POST', { reason: 'Test archive' })).status, 200);
    assert.equal((await request(clinical, 'POST', plan)).status, 409);
    assert.equal((await request('/appointment/register', 'POST', { ...booking, time: '17:00' })).status, 400);
    assert.equal((await request('/patient/' + p.id, 'DELETE')).status, 405);
    assert.equal((await request('/patient/' + p.id + '/archive', 'POST', { restore: true })).status, 200);
    assert.equal((await prisma.appointment.findUnique({ where: { id: appointment.id } })).status, 'Cancelled');
    assert.ok((await request(clinical)).data.length >= 6);
    console.log('PASS: clinical revisions, approvals, consent documents, progress, retention/discharge, access, conflicts, concurrent booking, rescheduling, audit, archive/restore.');
  } finally {
    const patientIds = [p.id, other.id];
    const documents = await prisma.clinicalRecord.findMany({ where: { patientId: { in: patientIds } }, select: { documentFile: true, id: true }, orderBy: { id: 'desc' } });
    for (const record of documents) {
      await prisma.clinicalRecord.delete({ where: { id: record.id } });
      if (record.documentFile) await fs.unlink(path.join(__dirname, '../../private/consents', record.documentFile)).catch(() => {});
    }
    await prisma.notification.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.historyLog.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.patientAccess.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [helper.id, student.id] } } });
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; prisma.$disconnect(); });
