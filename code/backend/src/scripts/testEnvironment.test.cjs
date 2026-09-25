const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateTestDatabase } = require('./testEnvironment.cjs');
test('allows a distinct explicitly named PostgreSQL test database', () => {
  assert.ok(validateTestDatabase('postgresql://u:p@localhost/orthoflow_test', 'postgresql://u:p@localhost/orthoflow'));
});
test('rejects missing or malformed test configuration', () => {
  for (const value of [undefined, '', 'not-a-url']) assert.throws(() => validateTestDatabase(value));
});
test('rejects production database names and non-PostgreSQL connections', () => {
  for (const value of ['postgresql://localhost/orthoflow', 'file:///orthoflow_test']) assert.throws(() => validateTestDatabase(value));
});
test('changing credentials, host, or schema cannot bypass same-name protection', () => {
  assert.throws(() => validateTestDatabase('postgresql://other:password@127.0.0.1/orthoflow_test?schema=test', 'postgresql://user:password@localhost/orthoflow_test?schema=public'));
});
