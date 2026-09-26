// Run once after Supabase and the public site exist. No secrets are printed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../code/backend/node_modules/dotenv').parse(fs.readFileSync(path.join(root, '.env.hosting')));
const { PrismaClient } = require('../code/backend/node_modules/@prisma/client');
async function main() {
  if (!config.CLOUD_DATABASE_URL || !config.APP_URL || !config.CRON_SECRET) throw new Error('Add CLOUD_DATABASE_URL, APP_URL and CRON_SECRET to .env.hosting after deployment.');
  const database = new URL(config.CLOUD_DATABASE_URL), app = new URL(config.APP_URL);
  if (!/\.(supabase\.co|supabase\.com)$/.test(database.hostname)) throw new Error('Scheduler installation is restricted to the Supabase cloud database.');
  if (app.protocol !== 'https:' || app.pathname !== '/' || app.search || app.username || app.password) throw new Error('APP_URL must be the deployed HTTPS origin.');
  if (config.CRON_SECRET.length < 32) throw new Error('CRON_SECRET must be at least 32 characters.');
  const prisma = new PrismaClient({ datasources: { db: { url: config.CLOUD_DATABASE_URL } } });
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_cron');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault');
    for (const [name, value] of [['orthoflow_app_url', app.origin], ['orthoflow_cron_secret', config.CRON_SECRET]]) {
      const rows = await prisma.$queryRawUnsafe('SELECT id::text FROM vault.secrets WHERE name = $1', name);
      if (rows.length) await prisma.$executeRawUnsafe('SELECT vault.update_secret($1::uuid, $2)', rows[0].id, value);
      else await prisma.$executeRawUnsafe('SELECT vault.create_secret($1, $2)', value, name);
    }
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.orthoflow_dispatch_reminders() RETURNS bigint
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
      DECLARE request_id bigint; endpoint text; token text;
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM public."Appointment" a JOIN public."Patient" p ON p.id = a."patientId"
          WHERE a.status IN ('Scheduled','Confirmed') AND p."archivedAt" IS NULL
            AND (a."patientReminderSentAt" IS NULL OR a."clinicianReminderSentAt" IS NULL)
            AND a."reminderDueAt" <= (now() AT TIME ZONE 'UTC')
            AND a."reminderDueAt" > (now() AT TIME ZONE 'UTC') - interval '24 hours'
        ) THEN RETURN NULL; END IF;
        SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name = 'orthoflow_app_url';
        SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name = 'orthoflow_cron_secret';
        IF endpoint IS NULL OR token IS NULL THEN RAISE EXCEPTION 'Reminder configuration missing'; END IF;
        SELECT net.http_post(url := endpoint || '/internal/reminders', body := '{}'::jsonb,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || token),
          timeout_milliseconds := 120000) INTO request_id;
        RETURN request_id;
      END $fn$`);
    await prisma.$executeRawUnsafe('REVOKE ALL ON FUNCTION public.orthoflow_dispatch_reminders() FROM PUBLIC, anon, authenticated');
    await prisma.$queryRawUnsafe(`SELECT cron.schedule('orthoflow-reminders', '*/15 * * * *', 'SELECT public.orthoflow_dispatch_reminders()')`);
    console.log('Reminder job installed: every 15 minutes, calls the app only when reminders are due. Inspect cron.job_run_details and net._http_response for outcomes.');
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Reminder setup failed. Check cloud configuration and Supabase extension/database permissions.'); process.exitCode = 1; });
