const path = require('node:path');
const backend = path.resolve(__dirname, '..');
function storagePaths(env = process.env) {
  const root = env.DATA_DIR ? path.resolve(env.DATA_DIR) : null;
  return {
    uploads: root ? path.join(root, 'uploads') : path.join(backend, 'public/uploads'),
    private: root ? path.join(root, 'private') : path.join(backend, 'private'),
    consents: root ? path.join(root, 'private/consents') : path.join(backend, 'private/consents'),
  };
}
function validateEnvironment(env = process.env) {
  if (!env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.length < 32 || /change-this|test-secret/i.test(env.JWT_SECRET)) throw new Error('Production JWT_SECRET must be a random secret of at least 32 characters.');
    if (!env.DATA_DIR || !path.isAbsolute(env.DATA_DIR)) throw new Error('Production DATA_DIR must be an absolute persistent storage path.');
  }
  for (const origin of (env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins without paths or trailing slashes.');
  }
}
function allowedOrigins(env = process.env) {
  const origins = (env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (env.RENDER_EXTERNAL_URL) origins.push(env.RENDER_EXTERNAL_URL);
  if (env.NODE_ENV !== 'production') origins.push('http://localhost:5173', 'http://127.0.0.1:5173');
  return new Set(origins);
}
module.exports = { storagePaths, validateEnvironment, allowedOrigins };
