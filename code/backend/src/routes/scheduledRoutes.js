const express = require('express');
const { timingSafeEqual } = require('node:crypto');
function authorized(header, secret) {
  if (!secret || secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const expected = Buffer.from(secret), actual = Buffer.from(header.slice(7));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function createScheduledRouter({ env = process.env, scan, emailReady } = {}) {
  const router = express.Router();
  let busy = false;
  router.post('/reminders', async (req, res) => {
    if (!authorized(req.get('authorization'), env.CRON_SECRET)) return res.sendStatus(401);
    const ready = emailReady || (() => require('../services/emailService').getEmailConfigStatus().ready);
    if (!ready()) return res.status(503).json({ message: 'Email delivery is not configured' });
    if (busy) return res.status(409).json({ message: 'Reminder scan already running' });
    busy = true;
    try {
      const results = await (scan || require('../services/appointmentReminderService').scanDueAppointmentReminders)();
      res.json({ processed: results.length, sent: results.filter(x => x.sent).length, failed: results.filter(x => x.error || x.reminderStatus === 'Failed').length });
    } catch { res.status(503).json({ message: 'Reminder scan failed' }); }
    finally { busy = false; }
  });
  return router;
}
module.exports = { createScheduledRouter, authorized };
