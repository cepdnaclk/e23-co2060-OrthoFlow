const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function validateTestDatabase(testUrl, liveUrl) {
  let target, live;
  try { target = new URL(testUrl); if (liveUrl) live = new URL(liveUrl); }
  catch { throw new Error('A valid TEST_DATABASE_URL is required.'); }
  if (!['postgresql:', 'postgres:'].includes(target.protocol) || !decodeURIComponent(target.pathname).endsWith('_test')) {
    throw new Error('Integration tests require a PostgreSQL database whose name ends in _test.');
  }
  // Reject the same database even when credentials or schema parameters differ.
  if (live && decodeURIComponent(target.pathname) === decodeURIComponent(live.pathname)) {
    throw new Error('The test database name must differ from the application database name.');
  }
  return target.href;
}

function configureTestEnvironment() {
  const root = path.resolve(__dirname, '../..');
  const read = name => fs.existsSync(path.join(root, name)) ? dotenv.parse(fs.readFileSync(path.join(root, name))) : {};
  const live = read('.env');
  const test = read('.env.test');
  const url = process.env.TEST_DATABASE_URL || test.TEST_DATABASE_URL;
  validateTestDatabase(url, live.DATABASE_URL);
  if (process.env.DATABASE_URL) validateTestDatabase(url, process.env.DATABASE_URL);
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'isolated-test-secret-not-for-deployment';
}

module.exports = { validateTestDatabase, configureTestEnvironment };
