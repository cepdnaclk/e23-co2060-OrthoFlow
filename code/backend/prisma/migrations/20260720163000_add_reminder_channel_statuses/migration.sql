ALTER TABLE "Appointment"
ADD COLUMN "patientEmailStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "patientSmsStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "patientNotificationStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "clinicianEmailStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "clinicianNotificationStatus" TEXT NOT NULL DEFAULT 'Pending';

UPDATE "Appointment"
SET
  "patientEmailStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "patientReminderSentAt" IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END,
  "patientSmsStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "patientReminderSentAt" IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END,
  "patientNotificationStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "patientReminderSentAt" IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END,
  "clinicianEmailStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "clinicianReminderSentAt" IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END,
  "clinicianNotificationStatus" = CASE
    WHEN "status" = 'Cancelled' THEN 'Not required'
    WHEN "clinicianReminderSentAt" IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END;
