// Creates and removes only its own uniquely named test database and temporary media.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const backend = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const name = 'orthoflow_deploy_' + randomUUID().replaceAll('-', '') + '_test';
const source = new URL(process.env.DATABASE_URL);
assert.ok(['postgres:', 'postgresql:'].includes(source.protocol));
const target = new URL(source);
target.pathname = '/' + name;
const admin = new PrismaClient({ datasources: { db: { url: source.href } } });
const db = new PrismaClient({ datasources: { db: { url: target.href } } });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orthoflow-deploy-'));
const password = randomBytes(24).toString('hex');
const env = { ...process.env, NODE_ENV: 'production', STORAGE_PROVIDER: 'local', EMAIL_PROVIDER: 'disabled', DATABASE_URL: target.href, JWT_SECRET: randomBytes(32).toString('hex'), DATA_DIR: dataDir, PORT: '0', ADMIN_USERNAME: 'deployment-admin', ADMIN_PASSWORD: password, REMINDERS_ENABLED: 'false', SMTP_HOST: '', CORS_ORIGINS: 'https://clinic.example' };
let child, created = false;
async function stop() {
  if (child && child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit'); child.kill(); await stopped;
  }
}
async function launch() {
  child = spawn(process.execPath, ['src/server.js'], { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Production startup timed out')), 30000);
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/Server running on port (\d+)/);
      if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); }
    });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Production process exited before readiness')); });
  });
}
async function main() {
  try {
    assert.match(name, /^orthoflow_deploy_[a-f0-9]+_test$/);
    await admin.$executeRawUnsafe('CREATE DATABASE "' + name + '"'); created = true;
    for (let i = 0; i < 2; i++) {
      const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: backend, env, encoding: 'utf8' });
      assert.equal(result.status, 0, 'Fresh database migrations (and rerun) must succeed: ' + (result.stderr || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED]'));
    }
    let base = await launch();
    assert.equal((await fetch(base + '/health')).status, 200);
    const html = await (await fetch(base + '/?page=patients')).text();
    const asset = html.match(/src="([^"]+\.js)"/);
    assert.ok(asset, 'Production frontend must be served');
    const javascript = await (await fetch(base + asset[1])).text();
    assert.ok(!javascript.includes('http://localhost:8080'), 'Production bundle must not point to localhost');
    assert.equal((await fetch(base + '/auth/unknown')).status, 404);
    const allowed = await fetch(base + '/auth/login', { method: 'OPTIONS', headers: { Origin: 'https://clinic.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://clinic.example');
    const denied = await fetch(base + '/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    async function login() {
      const result = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: env.ADMIN_USERNAME, password }) });
      assert.equal(result.status, 200); return (await result.json()).token;
    }
    const headers = { Authorization: 'Bearer ' + await login() };
    assert.equal(await db.user.count(), 1, 'No demo accounts in production');
    const patient = await db.patient.create({ data: { patientId: 'DEPLOY-TEST', name: 'Deployment test fixture' } });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const form = new FormData(); form.set('image', new Blob([png], { type: 'image/png' }), 'test.png');
    const uploaded = await fetch(base + '/radiograph/upload/' + patient.id, { method: 'POST', headers, body: form });
    assert.equal(uploaded.status, 201); const image = await uploaded.json();
    assert.ok(fs.existsSync(path.join(dataDir, 'uploads', path.basename(image.fileUrl))));
    assert.equal((await fetch(base + image.fileUrl)).status, 401);
    const definition = require('../../../shared/clinicalFields.json').find(x => x.kind === 'CONSENT');
    const fields = Object.fromEntries(definition.fields.filter(x => x.required).map(x => [x.key, x.options ? x.options[0] : x.type === 'date' ? '2026-09-26' : 'Deployment fixture']));
    const consent = new FormData(); consent.set('payload', JSON.stringify({ kind: 'CONSENT', data: fields }));
    const pdf = Buffer.from('%PDF-1.4\nDeployment fixture');
    consent.set('document', new Blob([pdf], { type: 'application/pdf' }), 'consent.pdf');
    const saved = await fetch(base + '/clinical/' + patient.id, { method: 'POST', headers, body: consent });
    assert.equal(saved.status, 201); const record = await saved.json();
    const documentUrl = '/clinical/' + patient.id + '/' + record.id + '/document';
    assert.equal((await fetch(base + documentUrl)).status, 401);
    await stop(); env.ADMIN_PASSWORD = randomBytes(24).toString('hex'); base = await launch();
    await login(); // Existing account password must not be reset by a deployment.
    assert.equal(await db.user.count(), 1);
    assert.deepEqual(Buffer.from(await (await fetch(base + image.fileUrl, { headers })).arrayBuffer()), png);
    assert.deepEqual(Buffer.from(await (await fetch(base + documentUrl, { headers })).arrayBuffer()), pdf);
    assert.equal((await fetch(base + '/radiograph/' + image.id, { method: 'DELETE', headers })).status, 200);
    assert.ok(!fs.existsSync(path.join(dataDir, 'uploads', path.basename(image.fileUrl))));
    console.log('PASS: fresh migrations, production startup, frontend assets, CORS, administrator login, protected image/consent uploads, persistence across restart, and media deletion.');
  } finally {
    await stop(); await db.$disconnect();
    if (created) await admin.$executeRawUnsafe('DROP DATABASE "' + name + '" WITH (FORCE)');
    await admin.$disconnect();
    if (path.dirname(dataDir) !== path.resolve(os.tmpdir()) || !path.basename(dataDir).startsWith('orthoflow-deploy-')) throw new Error('Unsafe cleanup path');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
