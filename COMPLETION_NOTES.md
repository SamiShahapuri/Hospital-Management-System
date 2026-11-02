# Refactor completion notes

This is a refactor of the existing Hospital Management System repository, not a replacement sample application. The original MongoDB/Express backend and React frontend were retained and reorganised around working role-specific routes and module APIs.

## Included functionality

- React Router navigation with independent Admin, Receptionist, Doctor, Patient, and public Guest routes. Doctor and Patient workspaces have no admin sidebar. A separate `/doctor/login` portal is provided.
- Patient registration is a staff action. A patient can activate an account only by matching an existing hospital Patient ID, full name, and registered email. Activation does not create a second patient record.
- New doctor creation provisions a linked Doctor-role login. Login accepts the sample usernames in the test plan or email addresses; the seeded aliases are `admin01`, `reception01`, and `drsmith`. Login has role-specific portals, invalid credential handling, five-attempt temporary lockout, and server-side token revocation on logout.
- Six seeded, illustrated departments: Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, and General Medicine. Department cards use local SVG illustrations rather than remote image dependencies.
- Patient directory, generated Patient IDs, search by ID/name/contact, staff registration with age and gender, clinical history, diagnosis/treatment and structured prescriptions (medicine, dosage, frequency, duration and instructions).
- Doctor availability by weekday, hours and consultation duration; server-generated slots; appointment booking, confirmation, rescheduling, cancellation, completion and no-show, with conflict checks and a database unique index for concurrent active slots.
- Guest appointment booking, without a guest login.
- Department → Ward → Room → Bed hierarchy, bed state management, admission, treatment notes, bed transfer history, required discharge summary, bed release, and room-charge bill generation.
- Itemised billing, payment methods/history, partial and full payment, balance due, and receipt/print view.
- Lab-test scheduling, status/result updates, reminders, and date-range reports.
- Role-scoped in-app reminders for appointments, lab tests and due bills; admin reports with date filters and CSV export; dashboard charts/visual summaries.

## Verification performed in this container

- Backend automated test run: **36 passed, 0 failed, 1 skipped** (37 total). The skipped test is the MongoDB-backed end-to-end integration suite; it requires `HMS_INTEGRATION_TESTS=1` and a separate test database. Its generated patient username is unique per run so repeated integration runs do not collide.
- The passing tests include source/contract checks and utility/profile validation tests. They are not a substitute for executing all 72 manual test-plan cases against a live database and browser.
- Server-side logout revocation was added using a token-version check.
- Final static validation: all 32 frontend JS/JSX files parsed and all local imports resolved; all backend JavaScript files passed `node --check`.
- The frontend Vite production build could not be run in this environment because dependencies are not present and access to the npm package registry previously failed with a DNS/network error. Re-run `npm install` and `npm run build` from `frontend/` in a network-enabled environment.
- Manual browser checks, accessibility/responsive checks, MongoDB integration tests and real print-dialog behaviour remain to be verified on the target machine.

## Test-plan coverage

See [`Documents/TEST_PLAN_COVERAGE.md`](Documents/TEST_PLAN_COVERAGE.md) for the case-by-case implementation mapping. The mapping distinguishes implemented code paths from tests actually executed; do not report an implementation mapping as a passed test result.

## Local run

1. Start MongoDB and create `backend/.env` from `backend/.env.example`; set a local-only random `JWT_SECRET` and `MONGODB_URI`.
2. In `backend/`, run `npm install`, `npm run seed`, then `npm run dev`.
3. In `frontend/`, run `npm install` then `npm run dev`.
4. Open `http://localhost:5173`. Staff use `/login`, Doctors use `/doctor/login`, Patients use `/patient/login`, and guest booking is `/book-appointment`.
5. For patient login, first register the person from Patient Records as Admin/Receptionist. Share the generated Patient ID; the patient activates using the same full name and registered email, then sets a password.

Use synthetic demo data only. This academic project is not a production-ready clinical system.
