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

## Verification status

The final recorded assessment was executed on 11 November 2026 using isolated test databases. The authoritative evidence is in [`Documents/TestingReport/`](Documents/TestingReport/).

- Unit testing: **44 passed, 0 failed**.
- MongoDB-backed integration testing: **8 passed, 0 failed**.
- Browser system testing: **12 passed, 0 failed, 20 not executed** from the 32-case system matrix.
- Overall planned matrix: **64 passed, 0 failed, 20 not executed** from 84 cases, or **76.2% passed**.
- Backend JavaScript syntax checks passed.
- The frontend Vite production build completed successfully and transformed 61 modules.
- The final Playwright run produced 11 genuine screenshots and no uncaught page errors.
- Four defects were corrected and covered by regression evidence: patient billing-scope authorization, dashboard component exports/imports, invalid HTML patterns, and a duplicate Admission index declaration.

The executed-scope pass rate is 100% because all 64 executed cases passed. This does not mean the entire project passed the testing assessment: 20 UI/manual scenarios remain not executed, including complete facility, admission, discharge, billing, receptionist, doctor, patient, print-dialog, human-concurrency, and production-volume checks.

## Test-plan coverage

See [`Documents/TEST_PLAN_COVERAGE.md`](Documents/TEST_PLAN_COVERAGE.md) for the case-by-case implementation mapping and [`Documents/TestingReport/TESTING_README.md`](Documents/TestingReport/TESTING_README.md) for actual execution commands and results. The mapping distinguishes implemented code paths from tests actually executed; do not report an implementation mapping as a passed test result.

## Local run

1. Start MongoDB and create `backend/.env` from `backend/.env.example`; set a local-only random `JWT_SECRET` and `MONGODB_URI`.
2. In `backend/`, run `npm install`, `npm run seed`, then `npm run dev`.
3. In `frontend/`, run `npm install` then `npm run dev`.
4. Open `http://localhost:5173`. Staff use `/login`, Doctors use `/doctor/login`, Patients use `/patient/login`, and guest booking is `/book-appointment`.
5. For patient login, first register the person from Patient Records as Admin/Receptionist. Share the generated Patient ID; the patient activates using the same full name and registered email, then sets a password.

Use synthetic demo data only. This academic project is not a production-ready clinical system.

## Documentation baseline

- [`Documents/SOFTWARE_ARCHITECTURE_DESIGN.md`](Documents/SOFTWARE_ARCHITECTURE_DESIGN.md) records the as-built architecture and design.
- [`Documents/SECURITY_REQUIREMENTS.md`](Documents/SECURITY_REQUIREMENTS.md) records security requirements, current control status, and the role-permission matrix.
- [`Documents/FINAL_VERIFICATION_CHECKLIST.md`](Documents/FINAL_VERIFICATION_CHECKLIST.md) contains the remaining manual checks.
