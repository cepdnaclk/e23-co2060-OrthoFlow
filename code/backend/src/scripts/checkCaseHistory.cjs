// Local integration check: isolated API without appointment/email schedulers.
require('./testEnvironment.cjs').configureTestEnvironment();
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

async function main() {
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  assert.ok(staff, 'A local staff account is needed for the integration check.');
  const app = express();
  app.use(express.json());
  app.use('/patient', require('../routes/patientRoutes'));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: staff.id, role: staff.role }, process.env.JWT_SECRET, { expiresIn: '2m' })}` };
  const url = `http://127.0.0.1:${server.address().port}/patient`;
  let patientId;
  try {
    let response = await fetch(`${url}/register`, { method: 'POST', headers, body: JSON.stringify({ fullName: 'Temporary Case History Verification', caseHistory: { facialProfile: 'Straight', investigations: ['OPG', 'CBCT'], rightOverjet: '2.5' } }) });
    assert.equal(response.status, 201);
    const created = await response.json();
    patientId = created.id;
    assert.equal(created.caseHistory.rightOverjet, 2.5);
    response = await fetch(`${url}/${patientId}`, { headers });
    assert.deepEqual((await response.json()).caseHistory, created.caseHistory);
    response = await fetch(`${url}/${patientId}`, { method: 'PUT', headers, body: JSON.stringify({ caseHistory: { skeletalPattern: 'Class 1', skeletalSeverity: 'Severe', investigations: ['Periapical'], rightOverjet: '0' } }) });
    assert.equal(response.status, 200);
    const edited = await response.json();
    assert.equal(edited.caseHistory.rightOverjet, 0);
    assert.equal(edited.caseHistory.skeletalSeverity, undefined);
    response = await fetch(`${url}/${patientId}`, { method: 'PUT', headers, body: JSON.stringify({ notes: 'Unrelated edit' }) });
    assert.deepEqual((await response.json()).caseHistory, edited.caseHistory);
    response = await fetch(`${url}/${patientId}`, { method: 'PUT', headers, body: JSON.stringify({ caseHistory: { rightOverjet: -1 } }) });
    assert.equal(response.status, 400);
    response = await fetch(`${url}/${patientId}`, { headers });
    const loaded = await response.json();
    assert.deepEqual(loaded.caseHistory, edited.caseHistory);
    assert.ok(loaded.historyLogs.some(log => log.details.includes('orthodontic case history')));
    console.log('PASS: registration, PostgreSQL round-trip, edit, partial update, validation, history log.');
  } finally {
    if (patientId) await prisma.$transaction([
      prisma.historyLog.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } })
    ]);
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; prisma.$disconnect(); });
