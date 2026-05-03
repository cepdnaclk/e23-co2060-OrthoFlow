const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Routes
const authRoutes = require("./routes/authRoutes").router;
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const radiographRoutes = require("./routes/radiographRoutes");

app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/appointment", appointmentRoutes);
app.use("/radiograph", radiographRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
