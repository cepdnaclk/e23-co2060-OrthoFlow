const path = require('node:path');
const fs = require('node:fs/promises');
const { storagePaths } = require('../config');

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const storageError = (status, message) => Object.assign(new Error(message), { status });
function checkName(area, filename) {
  if (!['uploads', 'consents'].includes(area) || typeof filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(filename) || filename.includes('..')) {
    throw storageError(400, 'Invalid storage filename');
  }
}
function createStorage({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const provider = env.STORAGE_PROVIDER || 'local';
  if (!['local', 'supabase'].includes(provider)) throw new Error('STORAGE_PROVIDER must be local or supabase.');
  if (provider === 'local') {
    const directories = storagePaths(env);
    return {
      async saveFile(area, filename, buffer) {
        checkName(area, filename);
        await fs.mkdir(directories[area], { recursive: true });
        await fs.writeFile(path.join(directories[area], filename), buffer, { flag: 'wx' });
      },
      async readFile(area, filename) {
        checkName(area, filename);
        try {
          return { buffer: await fs.readFile(path.join(directories[area], filename)), contentType: TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream' };
        } catch (error) {
          if (error.code === 'ENOENT') throw storageError(404, 'File not found');
          throw storageError(500, 'Could not read stored file');
        }
      },
      async deleteFile(area, filename) {
        checkName(area, filename);
        await fs.unlink(path.join(directories[area], filename)).catch(error => { if (error.code !== 'ENOENT') throw storageError(500, 'Could not delete stored file'); });
      },
    };
  }

  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error('Supabase storage requires SUPABASE_URL and a server secret key.');
  const project = new URL(env.SUPABASE_URL);
  if (project.protocol !== 'https:' || project.username || project.password || project.search || project.hash || (project.pathname !== '/' && project.pathname !== '')) {
    throw new Error('SUPABASE_URL must be an HTTPS project origin.');
  }
  const bucket = env.SUPABASE_STORAGE_BUCKET || 'orthoflow-private';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(bucket)) throw new Error('Invalid SUPABASE_STORAGE_BUCKET.');
  const headers = { apikey: key };
  // New Supabase secret keys are not JWTs; only legacy service-role JWTs use Bearer.
  if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;
  const base = project.origin + '/storage/v1';

  async function request(endpoint, options, allowMissing = false) {
    let response;
    try {
      response = await fetchImpl(base + endpoint, {
        ...options, headers: { ...headers, ...options.headers },
        redirect: 'error', signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw storageError(502, 'File storage is unavailable. Please try again.');
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      const missing = response.status === 404 || Number(problem.statusCode) === 404 || problem.code === 'NoSuchKey';
      if (allowMissing && missing) return null;
      throw storageError(missing ? 404 : 502, missing ? 'File not found' : 'File storage is unavailable. Please try again.');
    }
    return response;
  }
  const objectPath = (area, filename) => {
    checkName(area, filename);
    return '/' + encodeURIComponent(bucket) + '/' + area + '/' + encodeURIComponent(filename);
  };
  return {
    async saveFile(area, filename, buffer, contentType) {
      await request('/object' + objectPath(area, filename), {
        method: 'POST', headers: { 'Content-Type': contentType || TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'x-upsert': 'false', 'cache-control': 'no-store' }, body: buffer,
      });
    },
    async readFile(area, filename) {
      const response = await request('/object/authenticated' + objectPath(area, filename), { method: 'GET' });
      try {
        return { buffer: Buffer.from(await response.arrayBuffer()), contentType: TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream' };
      } catch {
        throw storageError(502, 'File storage is unavailable. Please try again.');
      }
    },
    async deleteFile(area, filename) {
      checkName(area, filename);
      await request('/object/' + encodeURIComponent(bucket), {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [area + '/' + filename] }),
      }, true);
    },
  };
}
let defaultStorage;
function currentStorage() { return defaultStorage ||= createStorage(); }
module.exports = {
  createStorage,
  saveFile: (...args) => currentStorage().saveFile(...args),
  readFile: (...args) => currentStorage().readFile(...args),
  deleteFile: (...args) => currentStorage().deleteFile(...args),
};
