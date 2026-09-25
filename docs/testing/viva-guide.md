# Milestone 4: testing presentation
## Suggested 60-second explanation
We tested at several levels. Node.js unit tests check clinical validation and reminder decisions
using mocked database and email services. Integration scripts exercise Express routes against
a separate PostgreSQL database. Playwright browser checks exercise registration, clinical records
and the calendar at desktop and mobile widths in both themes.
Each run saves timestamped logs and a machine-readable result summary.
We distinguish mocked UI checks from full end-to-end testing and limited unit coverage from
whole-system coverage. Manual clinician acceptance and real email delivery require separate evidence.

Replace general statements about execution with the actual results in results.md.
Show one unit log, one browser screenshot, and a bug with its fix and retest evidence.
Do not claim integration, SMTP, customer acceptance, or backup tests passed unless recorded.

## Questions to prepare
- Why mock email? Deterministic failure/success tests without contacting patients.
- How test a 24-hour reminder? Controlled time at just before, exactly at and after the threshold;
  verify cancellation, duplicate suppression, retries and notification creation.
  Current automated tests cover due-window behavior, not every exact boundary.
- Why PostgreSQL integration tests? Mocks cannot prove database constraints or transaction behavior.
- Is high coverage proof of correctness? No; assertions, scenarios and untested modules matter.
- What if SMTP accepts a message? That does not guarantee inbox delivery; inspect the test inbox too.
- What is regression testing? Rerunning checks after a fix to catch broken existing behavior.
- How protect patient data during tests? Fictional records, restricted test DB credentials,
  blocked clinical database names, mocked messaging and redacted evidence.

## D.J. Thotagamuwa: individual preparation
Run selected tests yourself and record your name/date on your own testing records.
Choose a feature you understand; explain its input, validation, database effect and expected failure behavior.
Explain one observed bug and the exact regression check used after fixing it.
Attribute team and tool-assisted contributions accurately. Do not claim ownership of work you did not perform.
Bring the source version, test logs and a short demo path; never display .env credentials.

