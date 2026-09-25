const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function appointment(id = 1, hours = 2) {
  const at = new Date(Date.now() + hours * 3600000);
  return {
    id, patientId: 'test-patient', date: at,
    time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
    type: 'adjustment', duration: '30min', status: 'Scheduled',
    patient: { name: 'Test Patient', email: 'patient@example.test', phone: '+94000000000' },
    patientEmailStatus: 'Pending', clinicianEmailStatus: 'Pending',
    patientNotificationStatus: 'Pending', clinicianNotificationStatus: 'Pending',
    patientReminderSentAt: null, clinicianReminderSentAt: null,
  };
}

function harness(rows, deliver = async () => ({ sent: true })) {
  const emails = [], panels = [], updates = [];
  let interval;
  const prisma = {
    appointment: {
      findUnique: async ({ where }) => rows.find(row => row.id === where.id),
      findMany: async ({ where }) => {
        assert.equal(where.status.in.join(','), 'Scheduled,Confirmed');
        return rows.filter(row => ['Scheduled', 'Confirmed'].includes(row.status) && (!row.patientReminderSentAt || !row.clinicianReminderSentAt));
      },
      update: async ({ where, data }) => { updates.push(data); Object.assign(rows.find(row => row.id === where.id), data); },
    },
    user: { findMany: async () => [{ id: 1, email: 'clinician@example.test' }] },
    notification: { create: async ({ data }) => { panels.push(data); return { id: 1 }; }, createMany: async ({ data }) => { panels.push(...data); } },
    historyLog: { create: async ({ data }) => { assert.match(data.details, /email reminder/); } },
  };
  const context = {
    // Transactions share the same in-memory data in these delivery tests.
    module: { exports: {} }, process: { env: {} }, console: { log() {}, error() {} },
    setInterval: (callback, ms) => { interval = { callback, ms }; return interval; },
    require: name => {
      if (name === '../prismaClient') return prisma;
      if (name === './emailService') return { sendEmail: async message => { emails.push(message); return deliver(message); } };
      throw new Error(`Unexpected delivery dependency: ${name}`);
    },
  };
  prisma.$executeRaw = async () => 1;
  prisma.$transaction = async fn => fn(prisma);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'appointmentReminderService.js'), 'utf8'), context);
  return { service: context.module.exports, emails, panels, updates, getInterval: () => interval };
}

test('automatic scan sends only patient/clinician emails within 24h plus panel notifications', async () => {
  const due = appointment(1, 2), later = appointment(2, 26), past = appointment(3, -2);
  const h = harness([due, later, past]);
  await h.service.scanDueAppointmentReminders();
  assert.equal(h.emails.length, 2);
  assert.equal(h.panels.length, 2);
  assert.equal(due.reminderStatus, 'Sent');
  assert.equal(later.patientEmailStatus, 'Pending');
  assert.equal(past.patientEmailStatus, 'Pending');
  assert.equal(Object.keys(h.updates[0]).some(key => /sms/i.test(key)), false);
  assert.equal(h.service.getAppointmentDateTime(due) - h.service.getReminderDueAt(due), 24 * 3600000);
  await h.service.scanDueAppointmentReminders();
  assert.equal(h.emails.length, 2, 'successful emails are not resent');
});

test('manual reminder works outside the 24h window', async () => {
  const h = harness([appointment(1, 72)]);
  const result = await h.service.sendAppointmentReminder(1, { force: true });
  assert.equal(result.sent, true);
  assert.equal(result.patientEmailStatus, 'Sent');
  assert.equal('sms' in result.patient, false);
  assert.equal('patientPhone' in result, false);
  assert.equal(h.emails.length, 2);
});

test('failed email retries preserve the recipient already sent', async () => {
  const row = appointment();
  row.patientReminderSentAt = new Date();
  row.patientEmailStatus = 'Sent';
  row.patientNotificationStatus = 'Sent';
  const h = harness([row]);
  await h.service.sendAppointmentReminder(1);
  assert.equal(h.emails.length, 1);
  assert.equal(h.emails[0].to[0], 'clinician@example.test');
  assert.equal(row.patientEmailStatus, 'Sent');
  assert.equal(row.patientNotificationStatus, 'Sent');
  assert.equal(row.reminderStatus, 'Sent');
});

test('phone alone does not count as email delivery and missing email is reported', async () => {
  const row = appointment();
  row.patient.email = null;
  const h = harness([row], async ({ to }) => to ? { sent: true } : { sent: false, skipped: true });
  const result = await h.service.sendAppointmentReminder(1);
  assert.equal(result.patientEmailStatus, 'Skipped');
  assert.equal(result.reminderStatus, 'Partial');
  assert.equal(row.patientReminderSentAt, null);
  assert.equal(h.panels.length, 2);
});

test('email failures are not treated as success just because notifications exist', async () => {
  const row = appointment();
  const h = harness([row], async () => { throw new Error('SMTP unavailable'); });
  const result = await h.service.sendAppointmentReminder(1);
  assert.equal(result.sent, false);
  assert.equal(result.reminderStatus, 'Failed');
  assert.equal(row.patientReminderSentAt, null);
  assert.equal(h.panels.length, 2);
});

test('cancelled appointments do not deliver reminders, even manually', async () => {
  const row = appointment();
  row.status = 'Cancelled';
  const h = harness([row]);
  const result = await h.service.sendAppointmentReminder(1, { force: true });
  assert.equal(result.skipped, true);
  assert.equal(h.emails.length, 0);
  assert.equal(row.patientEmailStatus, 'Not required');
});

test('scheduler retains its automatic five-minute polling interval', () => {
  const h = harness([]);
  h.service.startReminderScheduler();
  assert.equal(h.getInterval().ms, 5 * 60000);
});

test('completed, missed and archived cases never send emails', async () => {
  for (const status of ['Completed', 'Missed', 'Archived']) {
    const row = appointment();
    if (status === 'Archived') row.patient.archivedAt = new Date(); else row.status = status;
    const h = harness([row]);
    assert.equal((await h.service.sendAppointmentReminder(1, { force: true })).skipped, true);
    assert.equal(h.emails.length, 0);
  }
});
