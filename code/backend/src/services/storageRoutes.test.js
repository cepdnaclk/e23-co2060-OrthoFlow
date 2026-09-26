const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const jwt = require('jsonwebtoken');
const express = require('express');

const patientId = '22222222-2222-4222-8222-222222222222';
const secret = 'private-storage-route-tests-only';

async function harness(t, { databaseFailure = false, storageFailure = false } = {}) {
  const calls = { saved: [], removed: [], read: [], records: [], deletedRecords: [] };
  const patient = { id: patientId, archivedAt: null };
  const identity = { id: 1, username: 'test-staff', role: 'STAFF' };
  const prisma = {
    user: { findUnique: async ({ where }) => ({ ...identity, id: where.id, role: where.id === 2 ? 'STUDENT' : 'STAFF' }) },
    patient: { findUnique: async () => patient },
    patientAccess: { findUnique: async () => null },
    radiograph: {
      create: async ({ data }) => { calls.records.push(data); return { id: 1, ...data }; },
      findUnique: async () => ({ id: 1, patientId, fileUrl: '/uploads/existing.jpg' }),
      delete: async args => calls.deletedRecords.push(args),
    },
    clinicalRecord: {
      findUnique: async () => ({ id: 1, patientId, documentFile: 'signed.pdf', documentName: 'Consent form.pdf' }),
      create: async ({ data }) => { calls.records.push(data); return { id: 1, ...data }; },
    },
    historyLog: { create: async () => ({}) },
    $executeRaw: async () => 1,
  };
  prisma.$transaction = async callback => {
    if (databaseFailure) throw new Error('database rejected test write');
    return callback(prisma);
  };
  const storage = {
    saveFile: async (...args) => { if (storageFailure) throw Object.assign(new Error('File storage is unavailable. Please try again.'), { status: 502 }); calls.saved.push(args); },
    deleteFile: async (...args) => { if (storageFailure) throw Object.assign(new Error('File storage is unavailable. Please try again.'), { status: 502 }); calls.removed.push(args); },
    readFile: async (...args) => { calls.read.push(args); return { buffer: Buffer.from('%PDF-private'), contentType: 'application/pdf' }; },
  };
  const modules = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, relative);
    if (modules.has(filename)) return modules.get(filename);
    const localRequire = createRequire(filename);
    const context = {
      module: { exports: {} }, Buffer, console, process: { env: { JWT_SECRET: secret } },
      require: name => {
        if (name === '../prismaClient') return prisma;
        if (name === '../services/storageService') return storage;
        if (name === './authRoutes') return load('../routes/authRoutes.js');
        if (name === '../utils/patientAccess') return load('../utils/patientAccess.js');
        return localRequire(name);
      },
    };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    modules.set(filename, context.module.exports);
    return context.module.exports;
  }
  const app = express();
  app.use(express.json());
  app.use('/radiograph', load('../routes/radiographRoutes.js'));
  app.use('/clinical', load('../routes/clinicalRoutes.js'));
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const request = (url, options = {}, userId = 1) => fetch('http://127.0.0.1:' + server.address().port + url, {
    ...options,
    headers: { ...(userId ? { Authorization: 'Bearer ' + jwt.sign({ id: userId }, secret) } : {}), ...options.headers },
  });
  return { calls, request };
}
function imageForm() {
  const form = new FormData();
  form.set('image', new Blob([Buffer.from([255, 216, 255, 0])], { type: 'image/jpeg' }), 'scan.jpg');
  form.set('description', 'Private test image');
  return form;
}
function consentForm() {
  const form = new FormData();
  form.set('payload', JSON.stringify({ kind: 'CONSENT', data: {
    decision: 'Granted', scope: 'Treatment', signedDate: '2026-09-26', signer: 'Test Patient', signerRole: 'Patient',
  } }));
  form.set('document', new Blob(['%PDF-private'], { type: 'application/pdf' }), 'Consent form.pdf');
  return form;
}

test('image upload saves remotely before database work and retains the existing protected fileUrl', async t => {
  const { calls, request } = await harness(t);
  const result = await request('/radiograph/upload/' + patientId, { method: 'POST', body: imageForm() });
  assert.equal(result.status, 201);
  const image = await result.json();
  assert.match(image.fileUrl, /^\/uploads\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(calls.saved[0][0], 'uploads');
  assert.equal(image.fileUrl, '/uploads/' + calls.saved[0][1]);
  assert.equal(calls.saved[0][3], 'image/jpeg');
  assert.equal(calls.removed.length, 0);
});

test('failed image database writes remove the uploaded object', async t => {
  const { calls, request } = await harness(t, { databaseFailure: true });
  const result = await request('/radiograph/upload/' + patientId, { method: 'POST', body: imageForm() });
  assert.equal(result.status, 500);
  assert.equal(calls.saved.length, 1);
  assert.equal(calls.removed[0][0], 'uploads');
  assert.equal(calls.removed[0][1], calls.saved[0][1]);
});

test('failed storage upload or deletion preserves database records', async t => {
  const { calls, request } = await harness(t, { storageFailure: true });
  const upload = await request('/radiograph/upload/' + patientId, { method: 'POST', body: imageForm() });
  assert.equal(upload.status, 502);
  const deletion = await request('/radiograph/1', { method: 'DELETE' });
  assert.equal(deletion.status, 502);
  assert.equal(calls.records.length, 0);
  assert.equal(calls.deletedRecords.length, 0);
});

test('consent upload rollback deletes its private object when database work fails', async t => {
  const { calls, request } = await harness(t, { databaseFailure: true });
  const result = await request('/clinical/' + patientId, { method: 'POST', body: consentForm() });
  assert.equal(result.status, 500);
  assert.equal(calls.saved.length, 1);
  assert.equal(calls.saved[0][0], 'consents');
  assert.equal(calls.saved[0][3], 'application/pdf');
  assert.equal(calls.removed[0][0], 'consents');
  assert.equal(calls.removed[0][1], calls.saved[0][1]);
});

test('consent downloads enforce live account and patient access checks before reading storage', async t => {
  const { calls, request } = await harness(t);
  const url = '/clinical/' + patientId + '/1/document';
  assert.equal((await request(url, {}, null)).status, 401);
  assert.equal((await request(url, {}, 2)).status, 403);
  assert.equal(calls.read.length, 0);
  const permitted = await request(url);
  assert.equal(permitted.status, 200);
  assert.equal(await permitted.text(), '%PDF-private');
  assert.equal(permitted.headers.get('cache-control'), 'private, no-store');
  assert.match(permitted.headers.get('content-disposition'), /attachment; filename="Consent form.pdf"/);
  assert.match(permitted.headers.get('content-type'), /^application\/pdf/);
  assert.equal(calls.read.length, 1);
  assert.equal(calls.read[0].join('/'), 'consents/signed.pdf');
});

test('unauthenticated and student image uploads cannot reach storage', async t => {
  const { calls, request } = await harness(t);
  const url = '/radiograph/upload/' + patientId;
  assert.equal((await request(url, { method: 'POST', body: imageForm() }, null)).status, 401);
  assert.equal((await request(url, { method: 'POST', body: imageForm() }, 2)).status, 403);
  assert.equal(calls.saved.length, 0);
});
