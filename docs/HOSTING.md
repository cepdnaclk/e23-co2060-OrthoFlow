# Deploy OrthoFlow on Render

The production build serves React and the Express API from one HTTPS URL. PostgreSQL stores records; a paid persistent disk stores images and consent documents. Local Vite development still uses port 5173 with the API on port 8080.

## Deploy

1. Push this version, including render.yaml, to GitHub.
2. In https://dashboard.render.com/ choose New > Blueprint and connect cepdnaclk/e23-co2060-OrthoFlow, branch main.
3. Render reads render.yaml. Review the paid web service, PostgreSQL and storage charges before creating resources. Both services use Singapore.
4. Enter ADMIN_USERNAME and a unique ADMIN_PASSWORD of at least 12 characters. Render generates JWT_SECRET and connects DATABASE_URL automatically.
5. Deploy. The build installs dependencies, generates Prisma Client and builds React. The pre-deploy step applies PostgreSQL migrations. The server connects to the database and creates the first administrator before accepting traffic.
6. Open the web service HTTPS URL and sign in with the administrator credentials you supplied. Create staff/student accounts from the administrator interface. No demo accounts are created in production.
7. After a successful first login, remove ADMIN_PASSWORD from the service environment. An existing administrator is never overwritten on restart. Keep the password securely; changing ADMIN_PASSWORD later does not reset an existing account.

## Configuration

- NODE_ENV=production and DATA_DIR=/var/data are supplied by the Blueprint.
- JWT_SECRET must be a random value of at least 32 characters. Keep it stable across deployments; rotation invalidates sessions.
- Images use /var/data/uploads; consent documents use /var/data/private/consents. The server creates directories at runtime, when the disk is available.
- No VITE_API_URL is needed for this deployment. To use a separate frontend, set VITE_API_URL to the backend HTTPS origin before building and set backend CORS_ORIGINS to a comma-separated list of exact frontend origins, without trailing slashes. Never put secrets in VITE_ variables.
- The Render origin is allowed automatically. Same-origin custom domains work without cross-origin CORS configuration.
- REMINDERS_ENABLED=false disables the automatic reminder scheduler. It does not disable manually requested reminders.
- For email delivery, configure SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and MAIL_FROM in the backend environment. Use an app password where required. Leave SMTP unset until ready to send real messages; without it the app uses its existing mock-email behavior.
- TZ=Asia/Colombo keeps the hosted appointment/reminder clock aligned with Sri Lanka.
- REMINDER_ADVANCE_HOURS and REMINDER_SCAN_INTERVAL_MINUTES retain defaults of 24 hours and 5 minutes. A sleeping free service cannot reliably run this scheduler; the Blueprint uses paid compute and persistent storage.

## Verify after deployment

- /health must return HTTP 200 with status ok; it checks PostgreSQL on every request.
- Verify administrator login, a test patient, an image upload, and a consent attachment.
- Redeploy and confirm the patient and both files remain accessible to authorized users.
- Anonymous requests to uploaded images and consent documents must return 401.
- Do not use existing demonstration passwords on a publicly hosted system.

## Existing local data

The Blueprint starts with a new database. Git push does not upload PostgreSQL records or ignored media files. To migrate existing data, make a database backup plus uploads/private-file backup, restore into the hosted database, and copy media to the DATA_DIR layout. Review all existing accounts and replace demonstration credentials before exposing a restored database. Do not run migrations against an existing schema without first checking its migration history.

The backup script now reads media from DATA_DIR when configured. Running it requires PostgreSQL client tools (pg_dump, psql, etc.); Render native Node environments are not assumed to include them. Keep database and media backups together, outside the service, and verify restores. Render disk snapshots alone are not a complete database-and-media backup.

## Local verification

Run npm test in code/backend and npm run build in code/frontend. Then run npm run test:deployment in code/backend. The deployment check requires a local DATABASE_URL whose user can create databases; it creates and drops only its own uniquely named *_test database and temporary media directory. It runs production mode on a random port with email reminders disabled and never migrates the configured application database.

Official reference: https://render.com/docs/blueprint-spec
