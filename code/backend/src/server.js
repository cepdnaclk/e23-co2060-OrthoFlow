const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const prisma = require("./prismaClient");
const { startReminderScheduler } = require("./services/appointmentReminderService");
const { getEmailConfigStatus } = require("./services/emailService");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.get('/uploads/:filename', require('./routes/authRoutes').authenticateToken, async (req, res) => {
  try {
    const image = await prisma.radiograph.findFirst({ where: { fileUrl: `/uploads/${req.params.filename}` } });
    if (!image) return res.sendStatus(404);
    if (!await require('./utils/patientAccess').canReadPatient(req.user, image.patientId)) return res.sendStatus(403);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.join(__dirname, '../public/uploads', path.basename(req.params.filename)));
  } catch { res.sendStatus(500); }
});

app.get("/health", (req, res) => {
  const databaseUrl = process.env.DATABASE_URL || "";

  res.json({
    app: "OrthoRecords",
    apiVersion: "appointment-reminders-v2",
    dbProvider: databaseUrl.split(":")[0] || "unknown",
    email: getEmailConfigStatus(),
  });
});

// Seeding function
async function seedDatabase() {
  const users = [
    { username: "Nirod", password: "Nirod2004", role: "STAFF" },
    { username: "admin", password: "admin123", role: "ADMIN" },
    { username: "Anuda", password: "Anuda2004", role: "STUDENT" }
  ];

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { username: u.username } });
    if (!exists) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: { username: u.username, password: hashedPassword, role: u.role }
      });
      console.log(`Created default user: ${u.username}`);
    }
  }
}

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

const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  await seedDatabase();
  startReminderScheduler();
  console.log(`Server running on port ${PORT}`);
  console.log(`Database provider: ${(process.env.DATABASE_URL || "").split(":")[0] || "unknown"}`);
  console.log(`Email reminders ready: ${getEmailConfigStatus().ready ? "yes" : "no"}`);
});
