-- Only the server-side Prisma role should access application tables.
-- The table owner/PostgreSQL role used by Prisma bypasses RLS; Supabase anon/authenticated do not.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Radiograph" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HistoryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PatientAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClinicalRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
