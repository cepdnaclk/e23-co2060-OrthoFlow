const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const message = {
  to: 'patient@example.test',
  subject: 'Appointment reminder',
  text: 'Private patient appointment details',
  html: '<p>Private patient appointment details</p>',
};
const resendEnv = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-only-key', MAIL_FROM: 'Clinic <clinic@example.test>' };
const smtpEnv = { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'clinic@example.test', SMTP_PASS: 'test-only-password' };

function harness(env = {}, options = {}) {
  const requests = [], smtpMessages = [], logs = [];
  let smtpVerified = 0;
  const context = {
    module: { exports: {} }, process: { env }, AbortSignal,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (options.fetch) return options.fetch(url, init);
      return { ok: true, json: async () => ({ id: 'test-message-id' }) };
    },
    require: name => {
      if (name === './gmailService') return { gmailDelivery: { authorize: async () => 'test-access', send: async data => ({ sent: true, provider: 'gmail', messageId: 'gmail-id' }) } };
      assert.equal(name, 'nodemailer');
      if (options.noNodemailer) throw new Error('not installed');
      return {
        createTransport: () => ({
          verify: async () => { smtpVerified++; },
          sendMail: async data => {
            smtpMessages.push(data);
            return options.smtpResult || { accepted: data.to, rejected: [], messageId: 'smtp-test-id' };
          },
        }),
      };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'emailService.js'), 'utf8'), context);
  return { service: context.module.exports, requests, smtpMessages, logs, smtpVerified: () => smtpVerified };
}

test('missing production email configuration skips delivery without logging patient data', async () => {
  const h = harness({ NODE_ENV: 'production' });
  const result = await h.service.sendEmail(message);
  assert.equal(result.sent, false);
  assert.equal(result.skipped, true);
  assert.match(result.reason, /SMTP settings/);
  assert.equal(h.service.getEmailConfigStatus().ready, false);
  assert.equal(h.logs.length, 0);
  assert.equal(h.requests.length, 0);
  assert.equal(h.smtpMessages.length, 0);
});

test('local missing configuration also cannot falsely mark a reminder sent', async () => {
  const h = harness();
  const result = await h.service.sendEmail(message);
  assert.equal(result.sent, false);
  assert.equal(h.logs.length, 0);
});

test('missing recipients never call a delivery provider', async () => {
  const h = harness(resendEnv);
  const result = await h.service.sendEmail({ ...message, to: [null, '', '  '] });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'No recipient email address');
  assert.equal(h.requests.length, 0);
});

test('Resend uses HTTPS with a timeout and accepts only a confirmed API result', async () => {
  const h = harness(resendEnv, { noNodemailer: true });
  const result = await h.service.sendEmail({ ...message, to: [message.to, null, ' clinician@example.test '] });
  assert.equal(result.sent, true);
  assert.equal(result.provider, 'resend');
  assert.equal(result.messageId, 'test-message-id');
  assert.equal(h.requests.length, 1);
  const { url, init } = h.requests[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  assert.equal(init.headers.Authorization, 'Bearer test-only-key');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(init.body), {
    from: resendEnv.MAIL_FROM, to: [message.to, 'clinician@example.test'],
    subject: message.subject, text: message.text, html: message.html,
  });
  assert.equal(h.smtpMessages.length, 0);
  assert.equal(h.logs.length, 0);
});

test('incomplete Resend configuration does not silently fall back to SMTP', async () => {
  const h = harness({ ...smtpEnv, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-key' });
  const result = await h.service.sendEmail(message);
  assert.equal(result.sent, false);
  assert.match(result.reason, /MAIL_FROM/);
  assert.equal(h.smtpMessages.length, 0);
  assert.equal(h.requests.length, 0);
});

test('provider status preserves SMTP fields, adds Resend flags and never exposes credentials', () => {
  const h = harness({ ...resendEnv, EMAIL_PROVIDER: '' });
  const config = h.service.getEmailConfigStatus();
  assert.equal(config.provider, 'resend');
  assert.equal(config.ready, true);
  assert.equal(config.resendApiKeyConfigured, true);
  assert.equal(config.smtpHostConfigured, false);
  assert.equal(config.mailFromConfigured, true);
  assert.equal(JSON.stringify(config).includes(resendEnv.RESEND_API_KEY), false);
});

test('Resend configuration check never sends or claims to verify API credentials', async () => {
  const h = harness(resendEnv);
  const result = await h.service.verifyEmailConnection();
  assert.equal(result.verified, false);
  assert.equal(result.configurationValid, true);
  assert.equal(result.skipped, true);
  assert.match(result.reason, /not verified/);
  assert.match(result.reason, /no email sent/);
  assert.equal(h.requests.length, 0);
});

test('API rejection and network failures are failures with no patient data in errors', async () => {
  const rejected = harness(resendEnv, { fetch: async () => ({
    ok: false, status: 403, json: async () => ({ message: 'Sensitive recipient patient@example.test' }),
  }) });
  await assert.rejects(rejected.service.sendEmail(message), { message: 'Resend email delivery failed (HTTP 403)' });
  const offline = harness(resendEnv, { fetch: async () => { throw new Error('patient@example.test timeout'); } });
  await assert.rejects(offline.service.sendEmail(message), { message: 'Resend email request failed or timed out' });
  assert.equal(rejected.logs.length + offline.logs.length, 0);
});

test('a success HTTP status without a valid message ID does not mark delivery successful', async () => {
  const noId = harness(resendEnv, { fetch: async () => ({ ok: true, json: async () => ({}) }) });
  await assert.rejects(noId.service.sendEmail(message), /did not confirm email acceptance/);
  const badJson = harness(resendEnv, { fetch: async () => ({ ok: true, json: async () => { throw new Error('not JSON'); } }) });
  await assert.rejects(badJson.service.sendEmail(message), /invalid delivery response/);
});

test('SMTP is retained for local delivery and verifies its connection without sending', async () => {
  const h = harness(smtpEnv);
  const verified = await h.service.verifyEmailConnection();
  assert.equal(verified.verified, true);
  assert.equal(h.smtpVerified(), 1);
  assert.equal(h.smtpMessages.length, 0);
  const result = await h.service.sendEmail(message);
  assert.equal(result.sent, true);
  assert.equal(result.provider, 'smtp');
  assert.equal(result.messageId, 'smtp-test-id');
  assert.equal(h.smtpMessages[0].from, smtpEnv.SMTP_USER);
  assert.equal(h.requests.length, 0);
});

test('SMTP partial rejection cannot mark all clinicians notified', async () => {
  const h = harness(smtpEnv, { smtpResult: { accepted: ['one@example.test'], rejected: ['two@example.test'] } });
  await assert.rejects(h.service.sendEmail({ ...message, to: ['one@example.test', 'two@example.test'] }), /did not accept every recipient/);
});

test('disabled, unsupported providers and invalid SMTP ports skip delivery', async () => {
  for (const env of [
    { ...resendEnv, EMAIL_PROVIDER: 'disabled' },
    { ...resendEnv, EMAIL_PROVIDER: 'unsupported' },
    { ...smtpEnv, SMTP_PORT: 'invalid' },
  ]) {
    const h = harness(env);
    assert.equal(h.service.getEmailConfigStatus().ready, false);
    assert.equal((await h.service.sendEmail(message)).sent, false);
    assert.equal((await h.service.verifyEmailConnection()).verified, false);
    assert.equal(h.requests.length, 0);
    assert.equal(h.smtpMessages.length, 0);
  }
});

test('Gmail routes through HTTPS provider without SMTP or Resend', async () => {
  const h = harness({ EMAIL_PROVIDER: 'gmail', GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'secret', GMAIL_REFRESH_TOKEN: 'refresh', GMAIL_SENDER: 'clinic@example.test' });
  assert.equal(h.service.getEmailConfigStatus().ready, true);
  const result = await h.service.sendEmail(message);
  assert.equal(result.provider, 'gmail');
  assert.equal(result.sent, true);
  const checked = await h.service.verifyEmailConnection();
  assert.equal(checked.authorizationValid, true);
  assert.equal(checked.verified, false);
  assert.equal(h.smtpMessages.length, 0);
  assert.equal(h.requests.length, 0);
});
test('Incomplete Gmail credentials skip delivery even when SMTP is configured', async () => {
  const h = harness({ ...smtpEnv, EMAIL_PROVIDER: 'gmail' });
  const result = await h.service.sendEmail(message);
  assert.equal(result.sent, false);
  assert.match(result.reason, /GMAIL_CLIENT_ID/);
  assert.equal(h.smtpMessages.length, 0);
});
