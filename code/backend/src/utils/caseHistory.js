const sections = require('../../../shared/caseHistoryFields.json');
const fields = sections.flatMap(section => section.fields);

function isVisible(field, values) {
  return !field.when || field.when.values.includes(values[field.when.key]);
}

function validateCaseHistory(value) {
  const errors = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { errors: { caseHistory: 'Case history must be an object.' } };
  }
  const clean = {};
  for (const field of fields) {
    const answer = value[field.key];
    if (!isVisible(field, value) || answer === undefined || answer === '' || answer === null) continue;
    if (field.type === 'single') {
      if (!field.options.includes(answer)) errors[field.key] = 'Select a listed option.';
      else clean[field.key] = answer;
    } else if (field.type === 'multi') {
      if (!Array.isArray(answer) || answer.some(item => !field.options.includes(item))) {
        errors[field.key] = 'Select only listed options.';
      } else if (answer.length > 1 && field.exclusive?.some(item => answer.includes(item))) {
        errors[field.key] = 'Satisfactory cannot be combined with periodontal findings.';
      } else clean[field.key] = [...new Set(answer)];
    } else if (field.type === 'number') {
      if ((typeof answer !== 'string' && typeof answer !== 'number') || String(answer).trim() === '' || !Number.isFinite(Number(answer)) || Number(answer) < field.min) {
        errors[field.key] = 'Enter a non-negative measurement.';
      } else clean[field.key] = Number(answer);
    } else if (field.type === 'date') {
      if (typeof answer !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(answer) || !Number.isFinite(Date.parse(answer)) || new Date(answer).toISOString().slice(0, 10) !== answer) {
        errors[field.key] = 'Enter a valid date.';
      } else clean[field.key] = answer;
    } else if (typeof answer !== 'string' || answer.length > 5000) {
      errors[field.key] = 'Enter text of no more than 5,000 characters.';
    } else clean[field.key] = answer.trim();
  }
  return { value: clean, errors };
}

module.exports = { validateCaseHistory };
