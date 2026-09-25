const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('./authRoutes');
const { actor, httpError } = require('../utils/patientAccess');
const { getAppointmentDateTime, getReminderDueAt, scanDueAppointmentReminders, sendAppointmentReminder } = require('../services/appointmentReminderService');
const router = express.Router();
router.use(authenticateToken, authorizeRoles('STAFF', 'ADMIN'));
const active = ['Scheduled', 'Confirmed'];
const statuses = [...active, 'Cancelled', 'Completed', 'Missed'];
const include = { patient: { select: { name: true, patientId: true, phone: true, email: true } } };
function reminderState(required) {
  return {
    reminderStatus: required ? 'Pending' : 'Not required', reminderLastMessage: null,
    reminderLastAttemptAt: null, patientReminderSentAt: null, clinicianReminderSentAt: null,
    ...Object.fromEntries(['patientEmailStatus', 'patientNotificationStatus', 'clinicianEmailStatus', 'clinicianNotificationStatus'].map(key => [key, required ? 'Pending' : 'Not required']))
  };
}
function scheduleData(body, user) {
  const date = String(body.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time || '')) throw httpError(400, 'Enter a valid date and time');
  if (!/^\d+min$/.test(body.duration || '') || parseInt(body.duration) < 5 || parseInt(body.duration) > 240) throw httpError(400, 'Duration must be between 5 and 240 minutes');
  if (typeof body.type !== 'string' || !body.type.trim() || body.type.length > 200) throw httpError(400, 'Appointment type is required');
  const data = { patientId: body.patientId, clinicianId: Number(body.clinicianId || user.id), date: new Date(date), time: body.time, type: body.type.trim(), duration: body.duration };
  if (getAppointmentDateTime(data) <= new Date()) throw httpError(400, 'Choose a future appointment time');
  return data;
}
async function checkAvailable(tx, data, excludeId) {
  const patient = await tx.patient.findUnique({ where: { id: data.patientId } });
  if (!patient || patient.archivedAt) throw httpError(400, 'Select an active patient');
  const clinician = await tx.user.findFirst({ where: { id: data.clinicianId, role: { in: ['STAFF', 'ADMIN'] } } });
  if (!clinician) throw httpError(400, 'Select a clinician');
  const start = getAppointmentDateTime(data);
  const end = new Date(start.getTime() + parseInt(data.duration) * 60000);
  const rows = await tx.appointment.findMany({ where: {
    status: { in: active }, ...(excludeId ? { id: { not: excludeId } } : {}),
    date: { gte: new Date(start.getTime() - 86400000), lte: new Date(end.getTime() + 86400000) },
    OR: [{ patientId: data.patientId }, { clinicianId: data.clinicianId }, { clinicianId: null }]
  } });
  if (rows.some(row => {
    const other = getAppointmentDateTime(row);
    return start < new Date(other.getTime() + (parseInt(row.duration) || 30) * 60000) && end > other;
  })) throw httpError(409, 'This time overlaps an existing appointment for the patient or clinician (including unassigned appointments)');
}
router.get('/clinicians', async (req, res, next) => {
  try { res.json(await prisma.user.findMany({ where: { role: { in: ['STAFF', 'ADMIN'] } }, select: { id: true, fullName: true, username: true } })); } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try { res.json(await prisma.appointment.findMany({ include, orderBy: { date: 'asc' } })); } catch (error) { next(error); }
});
router.post('/register', async (req, res, next) => {
  try {
    const data = scheduleData(req.body, req.user);
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      await checkAvailable(tx, data);
      const saved = await tx.appointment.create({ data: { ...data, status: 'Scheduled', reminderDueAt: getReminderDueAt(data), ...reminderState(true) }, include });
      await tx.historyLog.create({ data: { patientId: saved.patientId, ...await actor(req.user, tx), action: 'Appointment Scheduled', details: `Appointment ${saved.id} on ${req.body.date} at ${data.time}`, changes: { after: JSON.parse(JSON.stringify(saved)) } } });
      return saved;
    });
    scanDueAppointmentReminders().catch(console.error);
    res.status(201).json(result);
  } catch (error) { next(error); }
});
router.patch('/:id/reschedule', async (req, res, next) => {
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const previous = await tx.appointment.findUnique({ where: { id: Number(req.params.id) } });
      if (!previous) throw httpError(404, 'Appointment not found');
      const data = scheduleData({ ...previous, ...req.body, patientId: previous.patientId }, req.user);
      await checkAvailable(tx, data, previous.id);
      const saved = await tx.appointment.update({ where: { id: previous.id }, data: { ...data, status: 'Scheduled', reminderDueAt: getReminderDueAt(data), ...reminderState(true) }, include });
      await tx.notification.updateMany({ where: { appointmentId: saved.id }, data: { read: true, readAt: new Date() } });
      await tx.historyLog.create({ data: { patientId: saved.patientId, ...await actor(req.user, tx), action: 'Appointment Rescheduled', details: `Appointment ${saved.id} rescheduled`, changes: { before: JSON.parse(JSON.stringify(previous)), after: JSON.parse(JSON.stringify(saved)) } } });
      return saved;
    });
    scanDueAppointmentReminders().catch(console.error);
    res.json(result);
  } catch (error) { next(error); }
});
router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!statuses.includes(req.body.status)) throw httpError(400, 'Invalid appointment status');
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
      const previous = await tx.appointment.findUnique({ where: { id: Number(req.params.id) } });
      if (!previous) throw httpError(404, 'Appointment not found');
      const status = req.body.status;
      if (status === 'Missed' && getAppointmentDateTime(previous) > new Date()) throw httpError(400, 'A future appointment cannot be marked missed');
      if (active.includes(status)) {
        const data = scheduleData({ ...previous, date: previous.date.toISOString(), clinicianId: previous.clinicianId || req.user.id }, req.user);
        await checkAvailable(tx, data, previous.id);
      }
      const state = !active.includes(status) ? reminderState(false) : !active.includes(previous.status) ? reminderState(true) : {};
      const saved = await tx.appointment.update({ where: { id: previous.id }, data: { status, ...state }, include });
      await tx.historyLog.create({ data: { patientId: saved.patientId, ...await actor(req.user, tx), action: 'Appointment Status Updated', details: `${previous.status} -> ${status}`, changes: { before: previous.status, after: status } } });
      return saved;
    });
    res.json(result);
  } catch (error) { next(error); }
});
router.post('/reminders/scan', async (req, res, next) => {
  try { const results = await scanDueAppointmentReminders(); res.json({ processed: results.length, results }); } catch (error) { next(error); }
});
router.post('/:id/remind', async (req, res, next) => {
  try {
    const result = await sendAppointmentReminder(req.params.id, { force: true });
    if (result.skipped) throw httpError(400, result.reason);
    if (!result.sent) return res.status(400).json({ message: 'No email delivered. Check recipient email addresses and SMTP settings.', result });
    res.json({ message: 'Reminder processed', result });
  } catch (error) { next(error); }
});
router.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update appointment' }));
module.exports = router;
