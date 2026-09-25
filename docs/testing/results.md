# Verified testing results

Run date: 2026-09-24 UTC (local evidence folders use UTC timestamps).
Environment: Windows, Node v24.15.0, Microsoft Edge via Playwright.
Project: Desktop copy of e23-co2060-OrthoFlow. No Git revision was assigned to this copy.
Execution: automated tool-assisted verification; not clinician acceptance or an individual student sign-off.

| Check | Outcome | Evidence |
| --- | --- | --- |
| Unit tests | 16 passed; 0 failed | [Unit log](evidence/runs/2026-09-24T18-11-00-948Z-unit/01.txt) |
| Coverage run | 16 tests passed | [Coverage log](evidence/runs/2026-09-24T18-11-18-301Z-coverage/01.txt) |
| Registration UI | Passed at 1440px and 390px; light/dark | [Browser log](evidence/runs/2026-09-24T18-15-06-097Z-ui/01.txt) |
| Clinical workflow UI | Passed at both widths; light/dark and print | [Browser log](evidence/runs/2026-09-24T18-15-06-097Z-ui/02.txt) |
| Calendar UI | Passed at both widths; filters, navigation, retry, themes | [Browser log](evidence/runs/2026-09-24T18-15-06-097Z-ui/03.txt) |
| Production build | Passed with bundle-size warning | [Build log](evidence/runs/2026-09-24T18-14-05-360Z-build/01.txt) |
| Database safety refusal | Both scripts refused missing TEST_DATABASE_URL before Prisma loaded | [Refusal evidence](evidence/runs/2026-09-24T18-15-01-802Z-integration/summary.json) |
| Database/API functionality | NOT EXECUTED in this verification; separate test database not configured | Requires .env.test and test:prepare |
| Manual and clinician acceptance | NOT EXECUTED | Complete manual-test-cases.csv |
| Real SMTP and restoration | NOT EXECUTED | Requires separate controlled tests |

## Coverage limitations
The report attributes 100% line/branch/function coverage to src/utils/caseHistory.js.
testEnvironment.cjs has 62.5% line coverage; configuration loading was not comprehensively exercised.
The VM-loaded reminder service does not appear in the coverage report.
The reported aggregate is NOT project coverage. Other routes, UI and services are outside this measurement.

## Evidence and interpretation
Three browser scripts passed across two viewport sizes: six viewport scenarios, not six unit tests.
Both themes are exercised in each scenario. Sixteen screenshots were collected under the latest UI run.
The browser scripts mock API responses; these results do not prove live database integration or inbox delivery.
The integration refusal logs correctly have nonzero exits and FAIL entries because execution was blocked.
Do not include them in a claim that integration functionality passed.
The build warns that the main JavaScript bundle exceeds 500 kB; code splitting remains a performance improvement.

## Suggested evidence for the presentation
Show the unit log total, one mobile calendar screenshot and the clinical workflow log.
Explain the FullCalendar version mismatch and the passing calendar regression test.
Keep the manual acceptance checklist visible as pending until a human actually executes it.
Raw evidence is ignored by Git; share only reviewed, redacted copies selected for evaluation.
