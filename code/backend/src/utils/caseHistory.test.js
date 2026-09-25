const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateCaseHistory } = require('./caseHistory');

test('preserves clinical selections, free text, zero and decimal measurements', () => {
  const result = validateCaseHistory({ investigations: ['OPG', 'CBCT'], facialProfile: 'Straight', rightOverjet: '0', leftOverjet: '2.5', familyHistory: '  Recorded history  ', examinationDate: '2026-09-24' });
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.value, { investigations: ['OPG', 'CBCT'], facialProfile: 'Straight', rightOverjet: 0, leftOverjet: 2.5, familyHistory: 'Recorded history', examinationDate: '2026-09-24' });
});

test('rejects impossible selections and invalid measurements/dates', () => {
  for (const value of [{ facialProfile: 'Invalid' }, { investigations: ['Unknown'] }, { rightOverjet: -1 }, { rightOverjet: true }, { rightOverjet: ' ' }, { examinationDate: '2026-02-30' }, { familyHistory: 'x'.repeat(5001) }, { periodontalHealth: ['Satisfactory', 'Plaque'] }]) {
    assert.ok(Object.keys(validateCaseHistory(value).errors).length);
  }
  for (const value of [null, [], 'invalid']) assert.ok(validateCaseHistory(value).errors.caseHistory);
});

test('removes inactive dependent answers and unknown fields', () => {
  const input = { skeletalPattern: 'Class 1', skeletalSeverity: 'Severe', upperCentreLine: 'Coincides with facial midline', upperCentreLineMm: 9, treatmentCategory: 'Mixed dentition review', treatmentAppliances: ['Fixed'], unknown: 'ignored' };
  const result = validateCaseHistory(input);
  assert.deepEqual(result.value, { skeletalPattern: 'Class 1', upperCentreLine: 'Coincides with facial midline', treatmentCategory: 'Mixed dentition review' });
  assert.equal(input.upperCentreLineMm, 9);
});

test('allows an unexamined record and deduplicates multiple findings', () => {
  assert.deepEqual(validateCaseHistory({}), { value: {}, errors: {} });
  assert.deepEqual(validateCaseHistory({ periodontalHealth: ['Plaque', 'Calculus', 'Plaque'] }).value.periodontalHealth, ['Plaque', 'Calculus']);
});
