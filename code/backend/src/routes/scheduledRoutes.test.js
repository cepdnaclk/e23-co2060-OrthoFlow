const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createScheduledRouter } = require('./scheduledRoutes');
test('scheduled reminders reject anonymous calls and redact patient details', async () => {
  let calls = 0;
  const secret = 's'.repeat(40);
  const app = express();
  app.use(createScheduledRouter({ env: { CRON_SECRET: secret }, emailReady: () => true, scan: async () => { calls++; return [{ sent: true, patientEmail: 'private@example.test' }]; } }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(base + '/reminders', { method: 'POST' })).status, 401);
    assert.equal(calls, 0);
    const response = await fetch(base + '/reminders', { method: 'POST', headers: { Authorization: 'Bearer ' + secret } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { processed: 1, sent: 1, failed: 0 });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
