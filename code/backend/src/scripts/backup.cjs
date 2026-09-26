require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const storage = require('../config').storagePaths();
const url = new URL(process.env.DATABASE_URL);
const database = decodeURIComponent(url.pathname.slice(1));
const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const common = ['-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username)];
const tables = ['User', 'Patient', 'Appointment', 'Radiograph', 'HistoryLog', 'Notification', 'PatientAccess', 'ClinicalRecord'];
const root = path.join(process.env.LOCALAPPDATA || os.homedir(), 'OrthoFlow', 'backups');
function run(tool, args) {
  return execFileSync(bin ? path.join(bin, tool + (process.platform === 'win32' ? '.exe' : '')) : tool, args, { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function counts(db) {
  return Object.fromEntries(tables.flatMap(table => {
    const exists = run('psql', [...common, '-d', db, '-At', '-c', `SELECT to_regclass('public."${table}"') IS NOT NULL`]);
    return exists === 't' ? [[table, Number(run('psql', [...common, '-d', db, '-At', '-c', `SELECT count(*) FROM "${table}"`]))]] : [];
  }));
}
function hash(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function files(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('Backup cannot include symbolic links');
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file, base) : [path.relative(base, file).split(path.sep).join('/')];
  });
}
function safeFile(dir, relative) {
  const file = path.resolve(dir, relative);
  if (!file.startsWith(path.resolve(dir) + path.sep)) throw new Error('Invalid backup file path');
  return file;
}
function verify(dir, manifest) {
  for (const [relative, expected] of Object.entries(manifest.hashes)) if (hash(safeFile(dir, relative)) !== expected) throw new Error('Backup checksum mismatch: ' + relative);
}
const command = process.argv[2];
try {
  if (process.env.STORAGE_PROVIDER === 'supabase') throw new Error('This local-media backup script cannot export Supabase objects. Export PostgreSQL and the private storage bucket together using the cloud provider before claiming a complete backup.');
  if (command === 'backup') {
    const destination = path.join(root, new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8));
    fs.mkdirSync(destination, { recursive: true });
    run('pg_dump', [...common, '-d', database, '-Fc', '-f', path.join(destination, 'database.dump')]);
    for (const [source, name] of [[storage.uploads, 'uploads'], [storage.private, 'private']]) {
      const location = source;
      if (fs.existsSync(location)) fs.cpSync(location, path.join(destination, name), { recursive: true });
      else fs.mkdirSync(path.join(destination, name));
    }
    const manifest = { version: 1, createdAt: new Date().toISOString(), counts: counts(database), hashes: Object.fromEntries(files(destination).map(file => [file, hash(path.join(destination, file))])) };
    fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
    verify(destination, manifest);
    console.log('Backup created: ' + destination);
  } else if (command === 'restore-check' || command === 'restore-copy') {
    const source = path.resolve(process.argv[3] || '');
    const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
    if (manifest.version !== 1) throw new Error('Unsupported backup format');
    verify(source, manifest);
    const restoredDb = 'orthoflow_restore_' + randomUUID().replaceAll('-', '');
    const restoredFiles = path.join(root, restoredDb);
    let created = false;
    let complete = false;
    try {
      run('createdb', [...common, restoredDb]); created = true;
      run('pg_restore', [...common, '-d', restoredDb, '--no-owner', '--no-acl', '--exit-on-error', path.join(source, 'database.dump')]);
      const restoredCounts = counts(restoredDb);
      if (JSON.stringify(restoredCounts) !== JSON.stringify(manifest.counts)) throw new Error('Restored database row counts do not match');
      fs.mkdirSync(restoredFiles);
      for (const name of ['uploads', 'private']) fs.cpSync(path.join(source, name), path.join(restoredFiles, name), { recursive: true });
      for (const [file, expected] of Object.entries(manifest.hashes)) if (file !== 'database.dump' && hash(safeFile(restoredFiles, file)) !== expected) throw new Error('Restored media checksum mismatch');
      complete = true;
      console.log('Restore verified: database row counts and every media checksum match.');
      if (command === 'restore-copy') {
        console.log('Recovered database: ' + restoredDb);
        console.log('Recovered media: ' + restoredFiles);
      }
    } finally {
      if (command === 'restore-check' || !complete) {
        if (created) run('dropdb', [...common, restoredDb]);
        if (path.dirname(restoredFiles) !== path.resolve(root) || !/^orthoflow_restore_[a-f0-9]+$/.test(path.basename(restoredFiles))) throw new Error('Unsafe cleanup path');
        fs.rmSync(restoredFiles, { recursive: true, force: true });
      }
    }
  } else throw new Error('Use: node src/scripts/backup.cjs backup | restore-check <backup-folder> | restore-copy <backup-folder>');
} catch (error) {
  console.error(error.stderr ? String(error.stderr).trim() : error.message);
  process.exitCode = 1;
}
