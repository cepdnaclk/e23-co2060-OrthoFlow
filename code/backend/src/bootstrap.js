const bcrypt = require('bcrypt');
async function bootstrapUsers(prisma, env = process.env) {
  if (env.NODE_ENV === 'production') {
    if (await prisma.user.count({ where: { role: 'ADMIN' } })) return;
    const username = (env.ADMIN_USERNAME || '').trim();
    const password = env.ADMIN_PASSWORD || '';
    if (!username || password.length < 12) throw new Error('First deployment requires ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.');
    if (await prisma.user.findUnique({ where: { username } })) throw new Error('ADMIN_USERNAME already belongs to another account. Choose a different username.');
    await prisma.user.create({ data: { username, password: await bcrypt.hash(password, 12), role: 'ADMIN', fullName: 'Administrator' } });
    console.log('Initial administrator created.');
    return;
  }
  if (env.NODE_ENV === 'test') return;
  const users = [
    { username: 'Nirod', password: 'Nirod2004', role: 'STAFF' },
    { username: 'admin', password: 'admin123', role: 'ADMIN' },
    { username: 'Anuda', password: 'Anuda2004', role: 'STUDENT' },
  ];
  for (const user of users) {
    if (!await prisma.user.findUnique({ where: { username: user.username } })) {
      await prisma.user.create({ data: { ...user, password: await bcrypt.hash(user.password, 10) } });
    }
  }
}
module.exports = { bootstrapUsers };
