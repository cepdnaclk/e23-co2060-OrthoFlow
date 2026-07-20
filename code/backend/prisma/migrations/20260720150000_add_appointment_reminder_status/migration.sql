ALTER TABLE "Appointment"
ADD COLUMN "reminderStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "reminderLastMessage" TEXT,
ADD COLUMN "reminderLastAttemptAt" TIMESTAMP(3);

UPDATE "Appointment"
SET
  "reminderStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "patientReminderSentAt" IS NOT NULL AND "clinicianReminderSentAt" IS NOT NULL THEN 'Sent'
    WHEN "patientReminderSentAt" IS NOT NULL OR "clinicianReminderSentAt" IS NOT NULL THEN 'Partial'
    ELSE 'Pending'
  END,
  "reminderLastMessage" = CASE
    WHEN "status" = 'Cancelled' THEN 'Appointment is cancelled'
    WHEN "patientReminderSentAt" IS NOT NULL AND "clinicianReminderSentAt" IS NOT NULL THEN 'Patient and clinician reminders sent'
    WHEN "patientReminderSentAt" IS NOT NULL OR "clinicianReminderSentAt" IS NOT NULL THEN 'Some reminder deliveries completed'
    ELSE NULL
  END;
