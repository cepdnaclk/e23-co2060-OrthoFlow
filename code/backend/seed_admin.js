const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await p.user.create({
    data: { username: 'admin', password: hashed, role: 'ADMIN' }
  });
  console.log('Admin created');
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
