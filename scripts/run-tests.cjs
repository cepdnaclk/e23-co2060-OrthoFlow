const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'unit';
const backend = path.join(root, 'code/backend');
const frontend = path.join(root, 'code/frontend');
const unit = ['src/services/storageRoutes.test.js', 'src/routes/scheduledRoutes.test.js', 'src/services/storageService.test.js', 'src/services/emailService.test.js', 'src/config.test.js', 'src/services/appointmentReminderService.test.js', 'src/utils/caseHistory.test.js', 'src/scripts/testEnvironment.test.cjs'];
const suites = {
  unit: [[backend, ['--test', ...unit]]],
  coverage: [[backend, ['--test', '--experimental-test-coverage', ...unit]]],
  integration: [[backend, ['src/scripts/checkCaseHistory.cjs']], [backend, ['src/scripts/checkClinicalWorkflow.cjs']]],
  ui: ['check-case-history.cjs', 'check-clinical-workflow.cjs', 'check-calendar.cjs'].map(file => [frontend, ['scripts/' + file]]),
  build: [[frontend, ['node_modules/vite/bin/vite.js', 'build']]],
};
if (!suites[mode]) { console.error('Usage: node scripts/run-tests.cjs unit|coverage|integration|ui|build'); process.exit(2); }
const startedAt = new Date().toISOString();
const output = path.join(root, 'docs/testing/evidence/runs', startedAt.replace(/[:.]/g, '-') + '-' + mode);
fs.mkdirSync(output, { recursive: true });
const results = [];
for (const [cwd, args] of suites[mode]) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024, env: process.env });
  const redact = value => value.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[DATABASE URL REDACTED]');
  const log = redact((result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error.message : ''));
  const file = String(results.length + 1).padStart(2, '0') + '.txt';
  fs.writeFileSync(path.join(output, file), log);
  process.stdout.write(log);
  if (mode === 'ui' && result.status === 0) {
    const folders = ['case-history-check', 'workflow-check', 'calendar-check'];
    const source = path.join(root, '.codex_tmp', folders[results.length]);
    const destination = path.join(output, folders[results.length]);
    if (fs.existsSync(source)) {
      fs.mkdirSync(destination, { recursive: true });
      for (const file of fs.readdirSync(source).filter(file => file.endsWith('.png'))) {
        if (fs.statSync(path.join(source, file)).mtimeMs >= Date.parse(startedAt)) fs.copyFileSync(path.join(source, file), path.join(destination, file));
      }
    }
  }
  results.push({ command: ['node', ...args].join(' '), cwd: path.relative(root, cwd), status: result.status === 0 && !result.error ? 'PASS' : 'FAIL', exitCode: result.status, signal: result.signal, log: file });
}
const summary = { startedAt, finishedAt: new Date().toISOString(), node: process.version, platform: process.platform, mode, results, scope: mode === 'ui' ? 'Mocked API browser checks, not live database E2E.' : mode === 'coverage' ? 'Unit-test coverage only; VM-loaded reminder source may not be attributed.' : 'See test-plan.md for scope and exclusions.' };
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('\nEvidence saved: ' + output);
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : 0;
