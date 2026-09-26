const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStorage } = require('./storageService');

const remote = {
  STORAGE_PROVIDER: 'supabase',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_backend_only',
  SUPABASE_STORAGE_BUCKET: 'orthoflow-private',
};

test('local files survive a storage instance restart, refuse overwrites, and delete idempotently', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'orthoflow-storage-test-'));
  t.after(async () => {
    assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('orthoflow-storage-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const env = { STORAGE_PROVIDER: 'local', DATA_DIR: folder };
  const original = createStorage({ env });
  await original.saveFile('uploads', 'scan.jpg', Buffer.from('image'));
  await original.saveFile('consents', 'signed.pdf', Buffer.from('%PDF-test'));
  await assert.rejects(original.saveFile('uploads', 'scan.jpg', Buffer.from('overwrite')), { code: 'EEXIST' });
  const restarted = createStorage({ env });
  assert.deepEqual(await restarted.readFile('uploads', 'scan.jpg'), { buffer: Buffer.from('image'), contentType: 'image/jpeg' });
  assert.deepEqual(await restarted.readFile('consents', 'signed.pdf'), { buffer: Buffer.from('%PDF-test'), contentType: 'application/pdf' });
  await restarted.deleteFile('uploads', 'scan.jpg');
  await restarted.deleteFile('uploads', 'scan.jpg');
  await assert.rejects(restarted.readFile('uploads', 'scan.jpg'), { status: 404, message: 'File not found' });
});

test('Supabase uploads remain private, do not overwrite, and use secret keys only as apikey', async () => {
  const calls = [];
  const storage = createStorage({ env: remote, fetchImpl: async (...args) => { calls.push(args); return new Response('{}'); } });
  const bytes = Buffer.from('%PDF-test');
  await storage.saveFile('consents', 'signed.pdf', bytes, 'application/pdf');
  const [url, request] = calls[0];
  assert.equal(url, 'https://example.supabase.co/storage/v1/object/orthoflow-private/consents/signed.pdf');
  assert.equal(request.method, 'POST');
  assert.equal(request.headers.apikey, remote.SUPABASE_SECRET_KEY);
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.headers['x-upsert'], 'false');
  assert.equal(request.headers['Content-Type'], 'application/pdf');
  assert.equal(request.body, bytes);
  assert.equal(request.redirect, 'error');
  assert.ok(request.signal instanceof AbortSignal);
});

test('Supabase downloads use authenticated endpoint and preserve bytes without exposing credentials', async () => {
  const calls = [];
  const bytes = Buffer.from([1, 2, 3, 255]);
  const storage = createStorage({
    env: { ...remote, SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-jwt' },
    fetchImpl: async (...args) => { calls.push(args); return new Response(bytes, { headers: { 'Content-Type': 'text/html' } }); },
  });
  const file = await storage.readFile('uploads', 'scan.png');
  assert.equal(calls[0][0], 'https://example.supabase.co/storage/v1/object/authenticated/orthoflow-private/uploads/scan.png');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer legacy-service-role-jwt');
  assert.equal(calls[0][1].method, 'GET');
  assert.deepEqual(file, { buffer: bytes, contentType: 'image/png' });
});

test('Supabase delete targets exactly one object in its own area', async () => {
  let called;
  const storage = createStorage({ env: remote, fetchImpl: async (...args) => { called = args; return new Response('[]'); } });
  await storage.deleteFile('uploads', 'image.jpg');
  assert.equal(called[0], 'https://example.supabase.co/storage/v1/object/orthoflow-private');
  assert.equal(called[1].method, 'DELETE');
  assert.deepEqual(JSON.parse(called[1].body), { prefixes: ['uploads/image.jpg'] });
});

test('invalid storage names cannot traverse directories or send provider requests', async () => {
  for (const env of [{ STORAGE_PROVIDER: 'local' }, remote]) {
    const storage = createStorage({ env, fetchImpl: async () => assert.fail('unexpected provider request') });
    for (const filename of ['../secret', '/file.pdf', 'nested/file.pdf', 'nested\\file.pdf', '..', '.env', 'a%2Ffile.pdf', 'a?.pdf', '']) {
      await assert.rejects(storage.saveFile('consents', filename, Buffer.from('data')), { status: 400 });
      await assert.rejects(storage.readFile('consents', filename), { status: 400 });
      await assert.rejects(storage.deleteFile('consents', filename), { status: 400 });
    }
    await assert.rejects(storage.readFile('private', 'file.pdf'), { status: 400 });
  }
});

test('provider failures are sanitized and failed deletion is not reported as successful', async () => {
  for (const method of ['saveFile', 'readFile', 'deleteFile']) {
    const storage = createStorage({
      env: remote,
      fetchImpl: async () => new Response(JSON.stringify({ message: remote.SUPABASE_SECRET_KEY }), { status: 403 }),
    });
    await assert.rejects(storage[method]('uploads', 'scan.jpg', Buffer.from('image'), 'image/jpeg'), error => {
      assert.equal(error.status, 502);
      assert.equal(error.message.includes(remote.SUPABASE_SECRET_KEY), false);
      return true;
    });
  }
  const unavailable = createStorage({ env: remote, fetchImpl: async () => { throw new Error(remote.SUPABASE_SECRET_KEY); } });
  await assert.rejects(unavailable.readFile('uploads', 'scan.jpg'), { status: 502, message: 'File storage is unavailable. Please try again.' });
});

test('Supabase missing-object variants become 404 reads and idempotent deletes', async () => {
  for (const [status, body] of [[404, {}], [400, { statusCode: '404' }], [400, { code: 'NoSuchKey' }]]) {
    const storage = createStorage({ env: remote, fetchImpl: async () => new Response(JSON.stringify(body), { status }) });
    await assert.rejects(storage.readFile('uploads', 'missing.jpg'), { status: 404 });
    await storage.deleteFile('uploads', 'missing.jpg');
  }
});

test('storage refuses unsupported providers, missing credentials and non-origin Supabase URLs', () => {
  assert.throws(() => createStorage({ env: { STORAGE_PROVIDER: 'unknown' } }), /STORAGE_PROVIDER/);
  assert.throws(() => createStorage({ env: { STORAGE_PROVIDER: 'supabase' } }), /SUPABASE_URL/);
  for (const url of ['http://example.supabase.co', 'https://key@example.supabase.co', 'https://example.supabase.co/path', 'https://example.supabase.co?key=test']) {
    assert.throws(() => createStorage({ env: { ...remote, SUPABASE_URL: url } }), /SUPABASE_URL/);
  }
});
