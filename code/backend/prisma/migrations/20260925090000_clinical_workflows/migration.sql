ALTER TABLE "Patient" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "archiveReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "clinicianId" INTEGER;
ALTER TABLE "HistoryLog" ADD COLUMN "actorId" INTEGER, ADD COLUMN "actorName" TEXT, ADD COLUMN "changes" JSONB;
CREATE TABLE "ClinicalRecord" (
  "id" SERIAL PRIMARY KEY,
  "patientId" UUID NOT NULL REFERENCES "Patient"("id") ON DELETE RESTRICT,
  "kind" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "previousId" INTEGER UNIQUE REFERENCES "ClinicalRecord"("id") ON DELETE RESTRICT,
  "data" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Recorded',
  "authorId" INTEGER NOT NULL,
  "authorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" INTEGER,
  "approvedName" TEXT,
  "approvedAt" TIMESTAMP(3),
  "documentName" TEXT,
  "documentFile" TEXT,
  "documentType" TEXT
);
CREATE INDEX "ClinicalRecord_patientId_kind_createdAt_idx" ON "ClinicalRecord"("patientId", "kind", "createdAt");
