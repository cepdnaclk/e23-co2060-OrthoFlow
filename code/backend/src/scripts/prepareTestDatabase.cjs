require('./testEnvironment.cjs').configureTestEnvironment();
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
async function main() {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '../..'), env: process.env, stdio: 'inherit',
  });
  if (result.error || result.status !== 0) throw new Error('Test database migrations failed.');
  const prisma = require('../prismaClient');
  try {
    await prisma.user.upsert({
      where: { username: 'automated-test-staff' },
      update: {},
      create: { username: 'automated-test-staff', fullName: 'Automated Test Staff', role: 'STAFF', password: crypto.randomBytes(32).toString('hex') },
    });
    console.log('Test schema and API-test staff fixture ready. This fixture has no usable login password.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

