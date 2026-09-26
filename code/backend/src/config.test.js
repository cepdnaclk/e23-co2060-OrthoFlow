const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { storagePaths, validateEnvironment, allowedOrigins } = require('./config');
const { bootstrapUsers } = require('./bootstrap');
const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/hosting_test', JWT_SECRET: 'a'.repeat(40), DATA_DIR: path.resolve('test-storage') };
test('production refuses missing persistence and weak JWT configuration', () => {
  assert.doesNotThrow(() => validateEnvironment(base));
  assert.throws(() => validateEnvironment({ ...base, DATA_DIR: '' }), /DATA_DIR/);
  assert.throws(() => validateEnvironment({ ...base, JWT_SECRET: 'change-this-secret' }), /JWT_SECRET/);
  assert.throws(() => validateEnvironment({ ...base, CORS_ORIGINS: 'https://example.com/path' }), /CORS_ORIGINS/);
});
test('production CORS excludes development and unconfigured origins', () => {
  const origins = allowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: 'https://clinic.example', RENDER_EXTERNAL_URL: 'https://clinic.onrender.com' });
  assert.equal(origins.has('http://localhost:5173'), false);
  assert.equal(origins.has('https://evil.example'), false);
  assert.equal(origins.has('https://clinic.example'), true);
  assert.equal(origins.has('https://clinic.onrender.com'), true);
});
test('persistent paths cover images and private consent documents', () => {
  const storage = storagePaths(base);
  assert.equal(storage.uploads, path.join(base.DATA_DIR, 'uploads'));
  assert.equal(storage.consents, path.join(storage.private, 'consents'));
  assert.match(storagePaths({}).uploads, /public[\\/]uploads$/);
});
test('production never seeds demo users or changes an existing administrator', async () => {
  const db = { user: { count: async () => 1, create: () => assert.fail('must not create users') } };
  await bootstrapUsers(db, { NODE_ENV: 'production' });
});
test('fresh production refuses weak or absent bootstrap credentials', async () => {
  const db = { user: { count: async () => 0, create: () => assert.fail('must not create users') } };
  await assert.rejects(bootstrapUsers(db, { NODE_ENV: 'production' }), /ADMIN_USERNAME/);
  await assert.rejects(bootstrapUsers(db, { NODE_ENV: 'production', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'short' }), /ADMIN_PASSWORD/);
});

test('Supabase production uses cloud persistence without a local disk', () => {
  assert.doesNotThrow(() => validateEnvironment({ ...base, DATA_DIR: '', STORAGE_PROVIDER: 'supabase', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'server-only-test' }));
  assert.throws(() => validateEnvironment({ ...base, STORAGE_PROVIDER: 'supabase' }), /server-only/);
});
