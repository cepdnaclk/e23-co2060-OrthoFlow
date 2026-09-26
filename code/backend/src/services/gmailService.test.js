const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGmailDelivery } = require('./gmailService');
const env = { GMAIL_CLIENT_ID: 'test-client', GMAIL_CLIENT_SECRET: 'test-secret', GMAIL_REFRESH_TOKEN: 'test-refresh', GMAIL_SENDER: 'clinic@example.test' };
const message = { to: ['patient@example.test'], subject: 'Appointment reminder', text: 'Test appointment', html: '<p>Test appointment</p>' };
const response = data => ({ ok: true, json: async () => data });
test('Gmail sends MIME via HTTPS and reuses the OAuth access token', async () => {
  const calls = [];
  const service = createGmailDelivery({ env, fetchImpl: async (url, init) => { calls.push({ url, init }); return response(url.includes('/token') ? { access_token: 'access-test', expires_in: 3600 } : { id: 'accepted-1' }); } });
  assert.equal((await service.send(message)).sent, true);
  await service.send(message);
  assert.equal(calls.length, 3);
  const form = new URLSearchParams(calls[0].init.body);
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), env.GMAIL_REFRESH_TOKEN);
  assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer access-test');
  const mime = Buffer.from(JSON.parse(calls[1].init.body).raw, 'base64url').toString();
  assert.match(mime, /From: clinic@example.test/);
  assert.match(mime, /To: patient@example.test/);
  assert.match(mime, /multipart\/alternative/);
  assert.match(mime, /Test appointment/);
  assert.ok(calls.every(c => c.init.redirect === 'error' && c.init.signal instanceof AbortSignal));
});
test('Expired tokens refresh before subsequent delivery', async () => {
  let time = 0, refreshes = 0;
  const service = createGmailDelivery({ env, now: () => time, fetchImpl: async url => { if (url.includes('/token')) { refreshes++; return response({ access_token: 'access-'+refreshes, expires_in: 120 }); } return response({ id: 'accepted' }); } });
  await service.send(message); time = 61000; await service.send(message);
  assert.equal(refreshes, 2);
});
test('Concurrent authorization shares a single refresh request', async () => {
  let count = 0;
  const service = createGmailDelivery({ env, fetchImpl: async () => { count++; return response({ access_token: 'access', expires_in: 3600 }); } });
  await Promise.all([service.authorize(), service.authorize()]); assert.equal(count, 1);
});
test('Revoked authorization stops delivery and does not expose provider secrets', async () => {
  let count = 0;
  const service = createGmailDelivery({ env, fetchImpl: async () => { count++; return { ok: false, status: 400, json: async () => ({ error: 'test-refresh private content' }) }; } });
  await assert.rejects(service.send(message), { message: 'Gmail authorization failed (HTTP 400)' }); assert.equal(count, 1);
});
test('Rate limit and missing acceptance ID never mark email sent', async () => {
  for (const result of [{ ok: false, status: 429 }, response({})]) {
    const service = createGmailDelivery({ env, fetchImpl: async url => url.includes('/token') ? response({ access_token: 'access', expires_in: 3600 }) : result });
    await assert.rejects(service.send(message), /Gmail (email delivery failed|did not confirm)/);
  }
});
test('Network failures return sanitized errors', async () => {
  const service = createGmailDelivery({ env, fetchImpl: async () => { throw Error('private credentials'); } });
  await assert.rejects(service.send(message), { message: 'Gmail authorization request failed or timed out' });
});
