# Test plan
## Objective and environment
Verify clinical data integrity, permissions, appointment handling, reminder behavior, and usable workflows.
Automated checks use fictional data. No real patient records or external email delivery are required.
Record application version, OS, Node version, browser, viewport, test date and tester with each evaluation run.

## Levels and existing tools
| Level | Tool | Scope |
| --- | --- | --- |
| Unit | node:test and node:assert | Clinical form validation, reminder decisions with mock Prisma/email/timer, database guard |
| Integration | Express, fetch, Prisma, PostgreSQL | Clinical API workflow, persistence, revisions, permissions, appointment conflicts, archive and audit |
| Browser | Playwright using Edge | Staged registration, patient tabs, clinical entries, calendar filters, retry states, themes, mobile layout |
| Build | Vite | Production compilation only |
| Manual acceptance | Recorded checklist and clinician review | Clinical wording, workflow suitability, real email delivery, accessibility and recovery |

## Requirement traceability
| Requirement | Automated evidence | Remaining checks |
| --- | --- | --- |
| Patient records | caseHistory.test.js, checkCaseHistory.cjs, check-case-history.cjs | Real form usability and registration uniqueness under concurrent creation |
| Clinical revisions and audit | checkClinicalWorkflow.cjs, check-clinical-workflow.cjs | Clinician acceptance and audit completeness |
| Appointment conflicts | checkClinicalWorkflow.cjs | Real-user calendar workflows |
| Email-only reminders | appointmentReminderService.test.js | Exact boundary cases, process restart recovery, real SMTP receipt |
| Patient permissions and files | checkClinicalWorkflow.cjs | Full role matrix and radiograph upload/download variants |
| Theme and mobile | Three Playwright scripts | Keyboard, screen reader, other browsers |
| Backups | Manual checklist | Fresh restore verification on an isolated database |

## Execution cycle
1. Select a source version and prepare isolated fixtures.
2. Run unit tests and coverage.
3. Prepare the dedicated database and run integration tests.
4. Start the frontend and run browser tests, then production build.
5. Execute manual cases; record actual results, not assumed outcomes.
6. Log failures with reproduction steps, expected/actual outcomes and severity.
7. Fix, rerun the failing test and affected regression suites; retain before/after evidence.
8. Review remaining risks and obtain clinician acceptance before deployment.

## Interpretation and exit criteria
No known unresolved critical/high-risk defect affecting access, patient data integrity or reminders.
All required automated suites pass on the selected source version.
Manual critical-path cases pass with evidence; clinicians confirm clinical options and workflow.
Untested cases stay Not run. A skipped or blocked test is never counted as passed.
Mock browser tests are not full end-to-end tests. SMTP success is not proof of automatic scheduling.
Coverage currently excludes VM-loaded reminder source and does not represent the whole application.
Do not present automated tooling work as a student's personal contribution without their review and participation.

## Remaining planned work
Dedicated-backend browser E2E, clock-controlled exact 24-hour boundaries, restart recovery,
broader upload/access tests, accessibility review, and backup restoration.
Use mock time for automated reminder boundaries; use only consented team inboxes for delivery checks.
Do not enable a real scheduler against the clinical database just to demonstrate tests.

