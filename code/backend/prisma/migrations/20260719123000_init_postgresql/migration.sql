CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "fullName" TEXT,
    "email" TEXT,
    "regNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Patient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Assessment',
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "chiefComplaint" TEXT,
    "medicalHistory" TEXT,
    "dentalHistory" TEXT,
    "allergies" TEXT,
    "referredBy" TEXT,
    "notes" TEXT,
    "guardian" TEXT,
    "guardianPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "patientId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderDueAt" TIMESTAMP(3),
    "patientReminderSentAt" TIMESTAMP(3),
    "clinicianReminderSentAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Radiograph" (
    "id" SERIAL NOT NULL,
    "patientId" UUID NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'RADIOGRAPH',
    "fileUrl" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "Radiograph_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoryLog" (
    "id" SERIAL NOT NULL,
    "patientId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "HistoryLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "patientId" UUID NOT NULL,
    "grantedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "patientId" UUID,
    "appointmentId" INTEGER,
    "recipientType" TEXT NOT NULL DEFAULT 'USER',
    "type" TEXT NOT NULL DEFAULT 'APPOINTMENT_REMINDER',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");
CREATE UNIQUE INDEX "PatientAccess_userId_patientId_key" ON "PatientAccess"("userId", "patientId");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "Notification_patientId_read_idx" ON "Notification"("patientId", "read");
CREATE INDEX "Notification_appointmentId_idx" ON "Notification"("appointmentId");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Radiograph" ADD CONSTRAINT "Radiograph_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoryLog" ADD CONSTRAINT "HistoryLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccess" ADD CONSTRAINT "PatientAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientAccess" ADD CONSTRAINT "PatientAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
