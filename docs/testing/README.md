# OrthoFlow testing
Use the Desktop project copy. No clinical data or real email recipients belong in these tests.

## Quick commands
From the project root in PowerShell:
```powershell
node scripts/run-tests.cjs unit
node scripts/run-tests.cjs coverage
node scripts/run-tests.cjs ui
node scripts/run-tests.cjs build
```
Install dependencies with npm ci in code/backend and code/frontend first.
The UI suite expects the frontend at http://localhost:5173 and Microsoft Edge installed.
Start it in a separate terminal with npm run dev -- --port 5173 --strictPort from code/frontend.
Playwright is a frontend development dependency. Browser tests intercept localhost:8080 API calls.
They do not verify the live database or SMTP service.

Equivalent commands: backend npm test, npm run test:coverage, npm run test:integration;
frontend npm test or npm run test:ui.

## Database integration setup (operator action required)
1. In pgAdmin create a new empty database named orthoflow_test, with a dedicated owner.
2. Give that owner rights only to this test database, not the clinical database.
3. In code/backend copy .env.test.example to .env.test and set TEST_DATABASE_URL.
4. Leave DATABASE_URL unset in your terminal. Do not change the application's .env.
5. From code/backend run npm run test:prepare, then npm run test:integration.

The preparation command applies migrations and creates a non-login staff fixture.
The database must already exist; no database creation, production migration, reset, or restore is automatic.
Both integration scripts validate configuration before loading Prisma, including when run directly.
Names must end in _test and differ from the application's database name.
These are safeguards, not a substitute for a database user with restricted permissions.
The workflow check temporarily writes a consent fixture under private/consents and cleans its own files.
Do not run multiple integration suites concurrently against the same database.
If a run is interrupted, inspect test fixtures before rerunning; never delete clinical data to clean up.

## Evidence
Every runner invocation creates docs/testing/evidence/runs/<UTC timestamp>-<suite>/:
- numbered text logs
- summary.json with commands, runtime, timestamps, status and exit codes
- browser PNGs when a UI script successfully completes

A nonzero exit code indicates failure or a timeout. Build results are not functional-test counts.
Raw runs are Git-ignored. Review and redact any evidence before sharing with evaluators.
Retain the exact application version/commit or a source snapshot alongside evidence.
Desktop copy has no Git metadata; do not invent a commit identifier.
See test-plan.md, manual-test-cases.csv, bug-log.csv, results.md, and viva-guide.md.

