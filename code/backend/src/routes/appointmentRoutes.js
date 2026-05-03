const express = require("express");
const prisma = require("../prismaClient");
const { authenticateToken } = require("./authRoutes");

const router = express.Router();

router.use(authenticateToken);

router.post("/register", async (req, res) => {
  try {
    const { patientId, date, time, type, duration, status } = req.body;
    
    // Here we should look up the actual internal patient ID, assuming patientId from frontend might be the String ID
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        date: new Date(date),
        time,
        type,
        duration,
        status: status || "Scheduled"
      }
    });

    await prisma.historyLog.create({
      data: {
        patientId,
        action: "Appointment Scheduled",
        details: `Scheduled for ${date} at ${time} for ${type}`
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: {
          select: { name: true, patientId: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock SMS sending endpoint
router.post("/:id/remind", async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { patient: true }
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Mock SMS sending
    console.log(`[SMS MOCK] Sending SMS to ${appointment.patient.phone}: "Reminder: You have an orthodontic appointment on ${appointment.date.toDateString()} at ${appointment.time}."`);

    await prisma.historyLog.create({
      data: {
        patientId: appointment.patientId,
        action: "SMS Reminder Sent",
        details: `Reminder sent for appointment on ${appointment.date.toDateString()}`
      }
    });

    res.json({ message: "SMS reminder sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
