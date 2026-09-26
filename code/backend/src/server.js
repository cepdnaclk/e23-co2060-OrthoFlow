require("dotenv").config({ path: require("node:path").resolve(__dirname, "../.env"), quiet: true });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("node:fs");
const { storagePaths, validateEnvironment, allowedOrigins } = require("./config");
const { bootstrapUsers } = require("./bootstrap");
const prisma = require("./prismaClient");
const { startReminderScheduler } = require("./services/appointmentReminderService");
const { readFile } = require("./services/storageService");
const { getEmailConfigStatus } = require("./services/emailService");

const storage = storagePaths();

const app = express();

app.disable("x-powered-by");
const origins = allowedOrigins();
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.has(origin)) }));
app.use(express.json());
app.get('/uploads/:filename', require('./routes/authRoutes').authenticateToken, async (req, res) => {
  try {
    const image = await prisma.radiograph.findFirst({ where: { fileUrl: `/uploads/${req.params.filename}` } });
    if (!image) return res.sendStatus(404);
    if (!await require('./utils/patientAccess').canReadPatient(req.user, image.patientId)) return res.sendStatus(403);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    const file = await readFile('uploads', req.params.filename);
    res.type(file.contentType).send(file.buffer);
  } catch (error) { res.sendStatus(error.status === 404 ? 404 : 502); }
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ app: 'OrthoRecords', status: 'ok', dbProvider: 'postgresql' });
  } catch { res.status(503).json({ app: 'OrthoRecords', status: 'unavailable' }); }
});

app.use('/internal', require('./routes/scheduledRoutes').createScheduledRouter());

// Routes
const authRoutes = require("./routes/authRoutes").router;
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const radiographRoutes = require("./routes/radiographRoutes");
const adminRoutes = require("./routes/adminRoutes");
const accessRoutes = require("./routes/accessRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/clinical", require('./routes/clinicalRoutes'));
app.use("/appointment", appointmentRoutes);
app.use("/radiograph", radiographRoutes);
app.use("/admin", adminRoutes);
app.use("/access", accessRoutes);
app.use("/notification", notificationRoutes);

// The production frontend and API share one HTTPS origin.
const frontend = path.resolve(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production') app.use(express.static(frontend));
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

async function start() {
  validateEnvironment();
  if (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(frontend, 'index.html'))) throw new Error('Build the frontend before starting production.');
  if ((process.env.STORAGE_PROVIDER || 'local') === 'local') {
    fs.mkdirSync(storage.uploads, { recursive: true });
    fs.mkdirSync(storage.consents, { recursive: true });
  }
  await prisma.$connect();
  await bootstrapUsers(prisma);
  const port = Number(process.env.PORT || 8080);
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
    listener.once('error', reject);
  });
  const timer = process.env.REMINDERS_ENABLED === 'false' || !getEmailConfigStatus().ready ? null : startReminderScheduler();
  console.log('Server running on port ' + server.address().port);
  console.log('Database provider: postgresql');
  console.log('Email reminders ready: ' + (getEmailConfigStatus().ready ? 'yes' : 'no'));
  const shutdown = () => {
    if (timer) clearInterval(timer);
    server.close(() => { prisma.$disconnect().finally(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}
if (require.main === module) start().catch(async () => {
  console.error('Startup failed. Check database access, migrations, build output and required environment settings.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
module.exports = { app, start };
