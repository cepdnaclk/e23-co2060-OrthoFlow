const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const prisma = require("./prismaClient");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

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

app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/appointment", appointmentRoutes);
app.use("/radiograph", radiographRoutes);
app.use("/admin", adminRoutes);
app.use("/access", accessRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  await seedDatabase();
  console.log(`Server running on port ${PORT}`);
});
