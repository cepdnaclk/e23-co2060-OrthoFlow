const prisma = require("../prismaClient");
const { sendEmail } = require("./emailService");

const REMINDER_ADVANCE_HOURS = Number(process.env.REMINDER_ADVANCE_HOURS || 24);
const REMINDER_SCAN_INTERVAL_MINUTES = Number(process.env.REMINDER_SCAN_INTERVAL_MINUTES || 5);

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "the scheduled time";

  const [rawHours = "0", rawMinutes = "0"] = String(time).split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatAppointmentType(type) {
  if (!type) return "Orthodontic Appointment";
  return String(type)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDuration(duration) {
  if (!duration) return "Not specified";
  const match = String(duration).match(/^(\d+)\s*min/i);
  if (match) return `${match[1]} minutes`;
  return duration;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getAppointmentDateTime(appointment) {
  const date = new Date(appointment.date);
  const [hours = "0", minutes = "0"] = String(appointment.time || "00:00").split(":");

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours),
    Number(minutes),
    0,
    0
  );
}

function getReminderDueAt(appointment) {
  return new Date(getAppointmentDateTime(appointment).getTime() - REMINDER_ADVANCE_HOURS * 60 * 60 * 1000);
}

function buildReminderContent(appointment) {
  const appointmentAt = getAppointmentDateTime(appointment);
  const patientName = appointment.patient?.name || "patient";
  const patientCode = appointment.patient?.patientId || appointment.patientId;
  const appointmentType = formatAppointmentType(appointment.type);
  const duration = formatDuration(appointment.duration);
  const dateText = formatDate(appointmentAt);
  const timeText = formatTime(appointment.time);

  const subject = "Appointment Reminder – OrthoFlow Clinic";
  const patientMessage = [
    `Dear ${patientName},`,
    "",
    "This is a friendly reminder of your upcoming orthodontic appointment at OrthoFlow Clinic.",
    "",
    "Appointment Details",
    `Patient Name: ${patientName}`,
    `Date: ${dateText}`,
    `Time: ${timeText}`,
    `Appointment Type: ${appointmentType}`,
    `Duration: ${duration}`,
    "",
    "Please arrive at least 10 minutes before your scheduled appointment time. If you have any previous dental records, radiographs, or related documents, please bring them with you.",
    "",
    "If you are unable to attend this appointment or need to reschedule, please contact the clinic as soon as possible.",
    "",
    "Thank you,",
    "OrthoFlow Clinic",
    "Digitizing Orthodontic Care",
    "",
    "This is an automated reminder. Please do not reply to this email.",
  ].join("\n");
  const patientHtml = `
    <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6; max-width: 620px;">
      <p>Dear ${escapeHtml(patientName)},</p>
      <p>This is a friendly reminder of your upcoming orthodontic appointment at <strong>OrthoFlow Clinic</strong>.</p>
      <h2 style="font-size: 18px; margin: 24px 0 12px; color: #0f172a;">Appointment Details</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
        <tr><td style="padding: 6px 0; font-weight: 700;">Patient Name:</td><td style="padding: 6px 0;">${escapeHtml(patientName)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Date:</td><td style="padding: 6px 0;">${escapeHtml(dateText)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Time:</td><td style="padding: 6px 0;">${escapeHtml(timeText)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Appointment Type:</td><td style="padding: 6px 0;">${escapeHtml(appointmentType)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Duration:</td><td style="padding: 6px 0;">${escapeHtml(duration)}</td></tr>
      </table>
      <p>Please arrive at least 10 minutes before your scheduled appointment time. If you have any previous dental records, radiographs, or related documents, please bring them with you.</p>
      <p>If you are unable to attend this appointment or need to reschedule, please contact the clinic as soon as possible.</p>
      <p style="margin-top: 24px;">Thank you,<br><strong>OrthoFlow Clinic</strong><br>Digitizing Orthodontic Care</p>
      <p style="margin-top: 24px; color: #64748b; font-size: 13px;">This is an automated reminder. Please do not reply to this email.</p>
    </div>
  `;
  const clinicianMessage =
    `Reminder: ${patientName} (${patientCode}) has a ${appointmentType} appointment ` +
    `on ${dateText} at ${timeText}.`;

  return {
    appointmentAt,
    dateText,
    timeText,
    subject,
    patientMessage,
    patientHtml,
    clinicianMessage,
    panelTitle: "Appointment reminder",
  };
}

async function notifyPatient(appointment, content, db = prisma) {
  const result = { notification: null, email: null, errors: [] };

  try {
    const notification = await db.notification.create({
      data: {
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        recipientType: "PATIENT",
        title: content.panelTitle,
        message: content.patientMessage,
        type: "APPOINTMENT_REMINDER",
      },
    });
    result.notification = { sent: true, id: notification.id };
  } catch (error) {
    result.notification = { sent: false, error: error.message };
    result.errors.push(`Patient notification: ${error.message}`);
  }

  try {
    result.email = await sendEmail({
      to: appointment.patient?.email,
      subject: content.subject,
      text: content.patientMessage,
      html: content.patientHtml,
    });
  } catch (error) {
    result.email = { sent: false, error: error.message };
    result.errors.push(`Patient email: ${error.message}`);
  }

  return result;
}

async function notifyClinicians(appointment, content, db = prisma) {
  const clinicians = await db.user.findMany({
    where: {
      role: { in: ["STAFF", "ADMIN"] },
      ...(appointment.clinicianId ? { id: appointment.clinicianId } : {}),
    },
    select: {
      id: true,
      email: true,
    },
  });

  const result = { notification: null, email: null, errors: [] };

  try {
    if (clinicians.length > 0) {
      await db.notification.createMany({
        data: clinicians.map((clinician) => ({
          userId: clinician.id,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          recipientType: "USER",
          title: content.panelTitle,
          message: content.clinicianMessage,
          type: "APPOINTMENT_REMINDER",
        })),
      });
    }
    result.notification = { sent: clinicians.length > 0, count: clinicians.length };
  } catch (error) {
    result.notification = { sent: false, error: error.message };
    result.errors.push(`Clinician notification: ${error.message}`);
  }

  try {
    result.email = await sendEmail({
      to: clinicians.map((clinician) => clinician.email),
      subject: content.subject,
      text: content.clinicianMessage,
      html: `<p>${content.clinicianMessage}</p>`,
    });
  } catch (error) {
    result.email = { sent: false, error: error.message };
    result.errors.push(`Clinician email: ${error.message}`);
  }

  return result;
}

function deliverySucceeded(delivery) {
  if (!delivery) return false;
  return Boolean(delivery.email?.sent);
}

function getChannelStatus(result) {
  if (!result) return "Pending";
  if (result.sent && result.mock) return "Mock";
  if (result.sent) return "Sent";
  if (result.skipped) return "Skipped";
  if (result.error) return "Failed";
  return "Pending";
}

function getNotificationStatus(result) {
  if (!result) return "Pending";
  if (result.sent) return "Sent";
  if (result.error) return "Failed";
  return "Pending";
}

function buildChannelStatuses({ appointment, patient, clinicians }) {
  if (!["Scheduled", "Confirmed"].includes(appointment.status)) {
    return {
      patientEmailStatus: "Not required",
      patientNotificationStatus: "Not required",
      clinicianEmailStatus: "Not required",
      clinicianNotificationStatus: "Not required",
    };
  }

  return {
    patientEmailStatus: patient ? getChannelStatus(patient.email) : appointment.patientEmailStatus,
    patientNotificationStatus: patient ? getNotificationStatus(patient.notification) : appointment.patientNotificationStatus,
    clinicianEmailStatus: clinicians ? getChannelStatus(clinicians.email) : appointment.clinicianEmailStatus,
    clinicianNotificationStatus: clinicians ? getNotificationStatus(clinicians.notification) : appointment.clinicianNotificationStatus,
  };
}

function buildReminderStatus({ appointment, patientSucceeded, clinicianSucceeded, errors, channelStatuses }) {
  if (!["Scheduled", "Confirmed"].includes(appointment.status)) {
    return {
      reminderStatus: "Not required",
      reminderLastMessage: "Appointment is not active",
    };
  }

  const patientSkippedOnly = channelStatuses.patientEmailStatus === "Skipped";

  if (patientSkippedOnly && clinicianSucceeded) {
    return {
      reminderStatus: "Partial",
      reminderLastMessage: "Clinician reminder sent; patient email was skipped",
    };
  }

  if (patientSucceeded && clinicianSucceeded) {
    return {
      reminderStatus: errors.length ? "Sent with warnings" : "Sent",
      reminderLastMessage: errors.length
        ? errors.join("; ")
        : "Patient and clinician reminders sent",
    };
  }

  if (patientSucceeded || clinicianSucceeded) {
    return {
      reminderStatus: "Partial",
      reminderLastMessage: errors.length
        ? errors.join("; ")
        : "Some reminder deliveries completed",
    };
  }

  return {
    reminderStatus: "Failed",
    reminderLastMessage: errors.length ? errors.join("; ") : "No reminder delivery completed",
  };
}

async function sendAppointmentReminder(appointmentId, options = {}) {
  return prisma.$transaction(async tx => {
    // Coordinate with rescheduling and archiving before reading the booking.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2060)`;
    return processAppointmentReminder(tx, appointmentId, options);
  }, { timeout: 60000, maxWait: 10000 });
}

async function processAppointmentReminder(prisma, appointmentId, options = {}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: Number(appointmentId) },
    include: { patient: true },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (!["Scheduled", "Confirmed"].includes(appointment.status) || appointment.patient?.archivedAt) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminderStatus: "Not required",
        reminderLastMessage: "Appointment is inactive or patient is archived",
        reminderLastAttemptAt: new Date(),
        patientEmailStatus: "Not required",
        patientNotificationStatus: "Not required",
        clinicianEmailStatus: "Not required",
        clinicianNotificationStatus: "Not required",
      },
    });
    return { skipped: true, reason: "Appointment is inactive or patient is archived" };
  }

  const reminderDueAt = getReminderDueAt(appointment);
  const content = buildReminderContent(appointment);
  const now = new Date();

  if (!options.force && content.appointmentAt < now) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminderStatus: "Failed",
        reminderLastMessage: "Appointment is already in the past",
        reminderLastAttemptAt: now,
        patientEmailStatus: "Skipped",
        patientNotificationStatus: "Skipped",
        clinicianEmailStatus: "Skipped",
        clinicianNotificationStatus: "Skipped",
      },
    });
    return { skipped: true, reason: "Appointment is already in the past" };
  }

  const patientAlreadySent = Boolean(appointment.patientReminderSentAt) && ["Sent", "Mock"].includes(appointment.patientEmailStatus);
  const clinicianAlreadySent = Boolean(appointment.clinicianReminderSentAt) && ["Sent", "Mock"].includes(appointment.clinicianEmailStatus);

  if (!options.force && patientAlreadySent && clinicianAlreadySent) {
    return { skipped: true, reason: "Reminder has already been sent" };
  }

  const result = {
    patient: null,
    clinicians: null,
  };

  if (options.force || !patientAlreadySent) {
    result.patient = await notifyPatient(appointment, content, prisma);
  }

  if (options.force || !clinicianAlreadySent) {
    result.clinicians = await notifyClinicians(appointment, content, prisma);
  }

  const patientSucceeded = result.patient ? deliverySucceeded(result.patient) : patientAlreadySent;
  const clinicianSucceeded = result.clinicians ? deliverySucceeded(result.clinicians) : clinicianAlreadySent;
  const errors = [
    ...(result.patient?.errors || []),
    ...(result.clinicians?.errors || []),
  ];
  const channelStatuses = buildChannelStatuses({
    appointment,
    patient: result.patient,
    clinicians: result.clinicians,
  });
  const statusUpdate = buildReminderStatus({
    appointment,
    patientSucceeded,
    clinicianSucceeded,
    errors,
    channelStatuses,
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      reminderDueAt,
      patientReminderSentAt: patientSucceeded ? now : appointment.patientReminderSentAt,
      clinicianReminderSentAt: clinicianSucceeded ? now : appointment.clinicianReminderSentAt,
      reminderLastAttemptAt: now,
      ...channelStatuses,
      ...statusUpdate,
    },
  });

  await prisma.historyLog.create({
    data: {
      patientId: appointment.patientId,
      action: "Appointment Reminder Processed",
      details: `24-hour email reminder processed for ${formatDate(content.appointmentAt)} at ${appointment.time}`,
    },
  });

  return {
    sent: patientSucceeded || clinicianSucceeded,
    appointmentId: appointment.id,
    patientEmail: appointment.patient?.email || null,
    reminderDueAt,
    appointmentAt: content.appointmentAt,
    ...channelStatuses,
    ...statusUpdate,
    warnings: errors,
    ...result,
  };
}

async function scanDueAppointmentReminders() {
  const now = new Date();
  const latestAppointmentDate = new Date(now.getTime() + (REMINDER_ADVANCE_HOURS + 2) * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["Scheduled", "Confirmed"] },
      patient: { archivedAt: null },
      OR: [
        { patientReminderSentAt: null },
        { clinicianReminderSentAt: null },
      ],
      date: {
        gte: startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
        lte: endOfDay(latestAppointmentDate),
      },
    },
    include: { patient: true },
    orderBy: { date: "asc" },
  });

  const dueAppointments = appointments.filter((appointment) => {
    const appointmentAt = getAppointmentDateTime(appointment);
    const hoursUntilAppointment = (appointmentAt.getTime() - now.getTime()) / (60 * 60 * 1000);
    return hoursUntilAppointment > 0 && hoursUntilAppointment <= REMINDER_ADVANCE_HOURS;
  });

  const results = [];
  for (const appointment of dueAppointments) {
    try {
      results.push(await sendAppointmentReminder(appointment.id));
    } catch (error) {
      console.error(`[REMINDER ERROR] Appointment ${appointment.id}:`, error.message);
      results.push({ appointmentId: appointment.id, error: error.message });
    }
  }

  if (dueAppointments.length > 0) {
    console.log(`[REMINDER SCAN] Processed ${dueAppointments.length} due appointment reminder(s).`);
  }

  return results;
}

function startReminderScheduler() {
  scanDueAppointmentReminders().catch((error) => {
    console.error("[REMINDER SCAN] Initial scan failed:", error.message);
  });

  const intervalMs = Math.max(1, REMINDER_SCAN_INTERVAL_MINUTES) * 60 * 1000;
  return setInterval(() => {
    scanDueAppointmentReminders().catch((error) => {
      console.error("[REMINDER SCAN] Scheduled scan failed:", error.message);
    });
  }, intervalMs);
}

module.exports = {
  getAppointmentDateTime,
  getReminderDueAt,
  scanDueAppointmentReminders,
  sendAppointmentReminder,
  startReminderScheduler,
};
