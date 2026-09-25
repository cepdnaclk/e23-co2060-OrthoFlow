const prisma = require('../prismaClient');
async function canReadPatient(user, patientId) {
  if (['STAFF', 'ADMIN'].includes(user.role)) return true;
  if (user.role !== 'STUDENT') return false;
  return Boolean(await prisma.patientAccess.findUnique({ where: { userId_patientId: { userId: user.id, patientId } } }));
}
async function actor(user, db = prisma) {
  const account = await db.user.findUnique({ where: { id: user.id }, select: { fullName: true, username: true } });
  return { actorId: user.id, actorName: account?.fullName || account?.username || `User ${user.id}` };
}
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
module.exports = { canReadPatient, actor, httpError };
