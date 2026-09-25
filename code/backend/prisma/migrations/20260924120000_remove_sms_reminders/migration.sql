-- An earlier SMS delivery must not suppress the new email-only reminder.
UPDATE "Appointment"
SET "patientReminderSentAt" = NULL,
    "reminderStatus" = 'Pending',
    "reminderLastMessage" = 'Email reminder pending'
WHERE "patientReminderSentAt" IS NOT NULL
  AND "patientEmailStatus" NOT IN ('Sent', 'Mock')
  AND "status" IN ('Scheduled', 'Confirmed');

-- Refresh current summaries affected by the retired delivery channel.
-- Historical audit logs remain unchanged.
UPDATE "Appointment"
SET "reminderStatus" = CASE
      WHEN "patientEmailStatus" IN ('Sent', 'Mock') AND "clinicianEmailStatus" IN ('Sent', 'Mock')
        THEN CASE WHEN "patientNotificationStatus" = 'Failed' OR "clinicianNotificationStatus" = 'Failed' THEN 'Sent with warnings' ELSE 'Sent' END
      WHEN "patientEmailStatus" IN ('Sent', 'Mock') OR "clinicianEmailStatus" IN ('Sent', 'Mock') THEN 'Partial'
      ELSE 'Pending'
    END,
    "reminderLastMessage" = 'Email delivery status updated; see email and panel statuses'
WHERE "status" IN ('Scheduled', 'Confirmed')
  AND ("reminderLastMessage" ILIKE '%SMS%' OR "patientSmsStatus" IN ('Sent', 'Mock', 'Failed'));

ALTER TABLE "Appointment" DROP COLUMN "patientSmsStatus";
