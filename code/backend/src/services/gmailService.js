const MailComposer = require('nodemailer/lib/mail-composer');

function createGmailDelivery({ env = process.env, fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
  let cachedToken;
  let expiresAt = 0;
  let refreshing;
  const value = key => String(env[key] || '').trim();
  async function request(url, options, label) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch { throw new Error(`${label} request failed or timed out`); }
    if (!response.ok) throw new Error(`${label} failed (HTTP ${response.status})`);
    try { return await response.json(); }
    catch { throw new Error(`${label} returned an invalid response`); }
  }
  async function accessToken() {
    if (cachedToken && now() < expiresAt) return cachedToken;
    if (!refreshing) refreshing = (async () => {
      const data = await request('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: value('GMAIL_CLIENT_ID'), client_secret: value('GMAIL_CLIENT_SECRET'), refresh_token: value('GMAIL_REFRESH_TOKEN'), grant_type: 'refresh_token' }).toString(),
      }, 'Gmail authorization');
      if (typeof data.access_token !== 'string' || !data.access_token.trim() || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw new Error('Gmail authorization did not return a valid token');
      cachedToken = data.access_token;
      expiresAt = now() + Math.max(0, Number(data.expires_in) - 60) * 1000;
      return cachedToken;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function send({ to, subject, text, html }) {
    const token = await accessToken();
    let mime;
    try {
      mime = await new MailComposer({ from: value('GMAIL_SENDER'), to, subject, text, html, disableFileAccess: true, disableUrlAccess: true }).compile().build();
    } catch { throw new Error('Gmail message preparation failed'); }
    const data = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: mime.toString('base64url') }),
    }, 'Gmail email delivery');
    if (typeof data.id !== 'string' || !data.id.trim()) throw new Error('Gmail did not confirm email acceptance');
    return { sent: true, provider: 'gmail', messageId: data.id };
  }
  return { send, authorize: accessToken };
}
const gmailDelivery = createGmailDelivery();
module.exports = { createGmailDelivery, gmailDelivery };
