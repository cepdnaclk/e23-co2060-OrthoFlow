# Clinical workflow and recovery

## Patient records
Open a patient to use Clinical workflow. Staff/clinicians can record treatment plans, visits, consent, retention and discharge. Students can read only patients assigned to them. Existing entries are retained; Revise creates a new linked version. Approve plan records the approving staff/clinician and time. The current role model treats STAFF as clinicians; it does not distinguish a consultant-only role.

Granted consent requires a PDF, PNG or JPEG signed document (10 MB maximum). A minor's consent record requires a parent/guardian and relationship. Record separate scopes separately. Uploaded evidence is retained with its original revision; a revised grant requires new evidence. Retention and discharge entries update the patient's status.

Print case summary / PDF opens the browser print dialog. Choose Save as PDF. It includes the structured examination, clinical revisions, approvals, appointments, and media register.

Archive patient preserves records and cancels active appointments. Use Archived patients in the patient list to find and restore an archived record. Restoring does not reactivate cancelled appointments.

## Appointments
New appointments require a clinician. Overlapping active bookings for the patient or clinician are rejected. Existing unassigned appointments reserve their time conservatively until a clinician is assigned through Reschedule. Rescheduling resets reminder delivery and marks old panel reminders read. Completed, missed, cancelled and archived cases are excluded from reminder delivery. Clinic dates/times use the backend computer's local timezone; configure the deployment timezone consistently.

## Backup and recovery
Stop the backend before backup so database and media remain consistent. Run from code/backend:

```powershell
node src/scripts/backup.cjs backup
node src/scripts/backup.cjs restore-check "C:\\path\\to\\backup-folder"
```

Backups contain a PostgreSQL custom-format dump, uploaded images, private consent documents, and a checksum manifest. They are stored outside the repository under LOCALAPPDATA/OrthoFlow/backups on Windows. Keep that folder access-controlled and copy backups to your institution's approved backup storage. Set PG_BIN in the environment if PostgreSQL tools are installed somewhere other than C:/Program Files/PostgreSQL/18/bin.

restore-check creates a separate temporary database, restores the dump, verifies table row counts and all media checksums, then removes only those temporary restored resources. It never overwrites the application's database.

For recovery into a retained separate database and folder:

```powershell
node src/scripts/backup.cjs restore-copy "C:\\path\\to\\backup-folder"
```

The command prints the new database name and recovered media folder. Stop the app, update DATABASE_URL to that database, and use the recovered uploads as backend/public/uploads and recovered private as backend/private. Preserve the existing folders until recovery is accepted, then run npm run db:deploy and npm run db:generate before restarting.

Backups are operator-run; this change does not configure scheduled backups or offsite storage.
