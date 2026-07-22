const express = require("express");
const prisma = require("../prismaClient");
const { authenticateToken, authorizeRoles } = require("./authRoutes");
const { getReminderDueAt, scanDueAppointmentReminders, sendAppointmentReminder } = require("../services/appointmentReminderService");

const router = express.Router();

router.use(authenticateToken);

const APPOINTMENT_STATUSES = ["Scheduled", "Confirmed", "Cancelled", "Completed"];

router.post("/register", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const { patientId, date, time, type, duration, status } = req.body;

    if (!patientId || !date || !time) {
      return res.status(400).json({ message: "Patient, date, and time are required" });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const reminderDueAt = getReminderDueAt({ date: new Date(date), time });

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        date: new Date(date),
        time,
        type,
        duration,
        status: status || "Scheduled",
        reminderDueAt,
        reminderStatus: status === "Cancelled" ? "Not required" : "Pending",
        reminderLastMessage: status === "Cancelled" ? "Appointment is cancelled" : null,
        patientEmailStatus: status === "Cancelled" ? "Not required" : "Pending",
        patientSmsStatus: status === "Cancelled" ? "Not required" : "Pending",
        patientNotificationStatus: status === "Cancelled" ? "Not required" : "Pending",
        clinicianEmailStatus: status === "Cancelled" ? "Not required" : "Pending",
        clinicianNotificationStatus: status === "Cancelled" ? "Not required" : "Pending",
      }
    });

    await prisma.historyLog.create({
      data: {
        patientId,
        action: "Appointment Scheduled",
        details: `Scheduled for ${date} at ${time} for ${type}`
      }
    });

    scanDueAppointmentReminders().catch((error) => {
      console.error("[REMINDER SCAN] Post-schedule scan failed:", error.message);
    });

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: {
          select: { name: true, patientId: true, phone: true, email: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/status", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid appointment status" });
    }

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { name: true, patientId: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const data = { status };
    if (status === "Cancelled") {
      data.reminderStatus = "Not required";
      data.reminderLastMessage = "Appointment is cancelled";
      data.reminderLastAttemptAt = new Date();
      data.patientEmailStatus = "Not required";
      data.patientSmsStatus = "Not required";
      data.patientNotificationStatus = "Not required";
      data.clinicianEmailStatus = "Not required";
      data.clinicianNotificationStatus = "Not required";
    } else if (existing.status === "Cancelled" && !existing.patientReminderSentAt && !existing.clinicianReminderSentAt) {
      data.reminderStatus = "Pending";
      data.reminderLastMessage = null;
      data.reminderLastAttemptAt = null;
      data.patientEmailStatus = "Pending";
      data.patientSmsStatus = "Pending";
      data.patientNotificationStatus = "Pending";
      data.clinicianEmailStatus = "Pending";
      data.clinicianNotificationStatus = "Pending";
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: {
          select: { name: true, patientId: true, phone: true, email: true }
        }
      }
    });

    await prisma.historyLog.create({
      data: {
        patientId: appointment.patientId,
        action: "Appointment Status Updated",
        details: `${existing.status} -> ${status} for ${appointment.date.toDateString()} at ${appointment.time}`,
      },
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Runs the same automatic due-reminder scan immediately for testing/admin use.
router.post("/reminders/scan", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const results = await scanDueAppointmentReminders();
    res.json({
      message: `Processed ${results.length} due appointment reminder(s)`,
      processed: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual reminder endpoint. Automatic 24-hour reminders run in the background.
router.post("/:id/remind", authorizeRoles("STAFF", "ADMIN"), async (req, res) => {
  try {
    const result = await sendAppointmentReminder(req.params.id, { force: true });
    if (result.skipped) {
      return res.status(400).json({ message: result.reason });
    }
    if (!result.sent) {
      return res.status(400).json({
        message: "No reminder could be delivered. Check that the patient or clinician has a valid email/phone.",
        result,
      });
    }
    res.json({
      message: result.warnings?.length
        ? "Reminder sent with warnings"
        : "Reminder sent successfully",
      result,
    });
  } catch (error) {
    if (error.message === "Appointment not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
