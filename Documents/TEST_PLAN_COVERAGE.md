# Test Plan Implementation Coverage

This document maps the supplied `testPlanDocument.pdf` (8 pages, 8 modules, 72 test cases) to the current code. It is an implementation review, **not a record that all 72 cases have passed execution**. The PDF's `Actual Result` and `Test Result` columns are still to be completed by running the cases on a local MongoDB-backed browser instance.

## Coverage summary

| Module | Cases in submitted plan | Implementation status | Main implementation locations |
|---|---:|---|---|
| M1 Authentication & Role Management | 10 | Implemented; live login/lockout/logout verification still required | `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`, `backend/src/models/User.js`, `frontend/src/App.jsx` |
| M2 Patient & Medical Record Management | 10 | Implemented; concurrent multi-user update scenario requires live stress verification | `backend/src/routes/patients.js`, `backend/src/models/Patient.js`, `frontend/src/pages/admin/PatientsPage.jsx`, `frontend/src/pages/doctor/DoctorPatientsPage.jsx` |
| M3 Doctor & Department Management | 9 | Implemented | `backend/src/routes/doctors.js`, `backend/src/routes/departments.js`, `backend/seed.js`, `frontend/src/pages/admin/DoctorsPage.jsx`, `frontend/src/pages/admin/DepartmentsPage.jsx` |
| M4 Appointment Management | 9 | Implemented; simultaneous booking must be run against MongoDB to verify the unique-index race path | `backend/src/routes/appointments.js`, `backend/src/models/Appointment.js`, `frontend/src/pages/admin/AppointmentsPage.jsx`, `frontend/src/pages/public/GuestBookingPage.jsx` |
| M5 Admission & Discharge Management | 8 | Implemented | `backend/src/routes/admissions.js`, `backend/src/routes/facility.js`, `backend/src/models/Admission.js`, `frontend/src/pages/admin/AdmissionsPage.jsx`, `frontend/src/pages/admin/BedsPage.jsx` |
| M6 Billing & Payment Management | 9 | Implemented; receipt print dialog requires browser verification | `backend/src/routes/billing.js`, `backend/src/models/Bill.js`, `frontend/src/pages/admin/BillingPage.jsx`, `frontend/src/pages/patient/PatientBillsPage.jsx` |
| M7 Notification & Reminder Management | 8 | Partial: in-app derived reminders are implemented; no background delivery scheduler, email/SMS transport, or persistent delivery log | `backend/src/routes/notifications.js`, `backend/src/routes/labTests.js`, `frontend/src` dashboard notification components |
| M8 Report Management | 9 | Implemented; 12-month performance needs local dataset benchmarking | `backend/src/routes/reports.js`, `frontend/src/pages/admin/ReportsPage.jsx` |

The core user-facing workflows for all eight modules are present, and all 72 submitted scenarios have an implementation mapping. Four acceptance points need explicit environment-based verification before calling the project fully tested: concurrent booking against MongoDB, concurrent patient-record editing, the browser receipt-print flow, and report performance over a large 12-month dataset. Notification delivery is intentionally limited to derived in-app reminders. This means the source covers the requested 70–80% feature scope, but it is **not** a claim that 70–80% of the PDF test cases have been executed and passed.

## Case-to-feature mapping

### M1 — User Authentication & Role Management (10)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M1_01` | Seeded `admin01` (or its email alias) signs into the staff portal and receives the Admin workspace. |
| `UT_M1_02` | Invalid credentials return an authentication error. |
| `UT_M1_03` | Login form requires email and password before submission. |
| `UT_M1_04` | Dedicated `/doctor/login` portal accepts `drsmith` (or its email alias) and other Doctor-role accounts and routes them to Doctor pages. |
| `UT_M1_05` | Staff portal accepts `reception01` (or its email alias) and routes to Receptionist pages. |
| `UT_M1_06` | Dedicated `/patient/login` portal accepts Patient accounts linked to an existing patient record; activation can assign `patient01` as the username. |
| `IT_M1_01` | Role-protected routes and API `allowRoles` checks prevent Receptionist access to Admin-only billing/reports. |
| `IT_M1_02` | Logout increments server-side `tokenVersion`; the old token is rejected by authenticated APIs. |
| `ST_M1_01` | Admin, Doctor, Receptionist and Patient render their own role-specific workspaces. |
| `ST_M1_02` | Separate role portals/role route guards keep the correct dashboard and menu options per role. |

### M2 — Patient & Medical Record Management (10)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M2_01` | Admin/Receptionist registers patient name, age, gender, phone, email and address; server generates a unique Patient ID, and the directory displays it. |
| `UT_M2_02` | Required name validation prevents incomplete registration. |
| `UT_M2_03` | Phone/email validation rejects malformed contact data. |
| `UT_M2_04` | Doctor adds diagnosis/treatment history to an existing patient. |
| `UT_M2_05` | Doctor records medicine, dosage, frequency, duration and instructions within the patient's clinical record. |
| `IT_M2_01` | Patient directory search accepts a Patient ID and returns the matching patient. |
| `IT_M2_02` | Staff edits synchronise the patient's contact details with a linked login account; Doctor reads the same persisted profile. |
| `IT_M2_03` | Duplicate email/contact registration is rejected with a duplicate warning. |
| `ST_M2_01` | Doctor patient view loads personal details and saved clinical history/prescriptions from the same patient record. |
| `ST_M2_02` | Patient identity/contact/history are persisted in MongoDB; concurrent multi-user update stress testing remains a manual check. |

**Important patient rule:** a login activation is not a registration. Admin/Receptionist must first create the hospital record; the patient then activates an account by supplying the matching Patient ID, full name, registered email, chosen username and password. An unmatched patient cannot create a new record from the login page.

### M3 — Doctor & Department Management (9)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M3_01` | Staff adds a Doctor with specialization, department, availability and Doctor login credentials. |
| `UT_M3_02` | Admin creates a department with a selected medical illustration. |
| `UT_M3_03` | Doctor creation validates required specialization and credentials. |
| `UT_M3_04` | Doctor availability stores working weekdays, opening/closing times and consultation duration. |
| `IT_M3_01` | Doctor's department appears in the department roster. |
| `IT_M3_02` | Doctor directory filters by department. |
| `IT_M3_03` | Appointment availability is calculated from the Doctor's working hours and duration. |
| `ST_M3_01` | Deactivated Doctor is excluded from new booking choices; existing appointment records remain historical records. |
| `ST_M3_02` | Department deletion is blocked while active Doctors are assigned. |

The seeded demo contains six illustrated departments only: Cardiology (heart), Neurology (brain), Orthopedics (bone), Pediatrics (child), Dermatology (skin), and General Medicine.

### M4 — Appointment Management (9)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M4_01` | Patient/Guest/Receptionist books a future time selected from server-generated Doctor slots. |
| `UT_M4_02` | Slot overlap or duplicate active booking returns a conflict response. |
| `UT_M4_03` | Booked appointment can be rescheduled into a new available slot. |
| `UT_M4_04` | Appointment can be cancelled; cancelled status no longer occupies the slot index. |
| `UT_M4_05` | Past dates and times are rejected. |
| `IT_M4_01` | Released slot becomes available to another patient after cancellation. |
| `IT_M4_02` | Doctor schedule queries show appointments assigned to that Doctor. |
| `ST_M4_01` | Book → reschedule → reminder view → complete lifecycle is represented by the appointment API and UI. |
| `ST_M4_02` | A unique partial MongoDB index across active slot minutes protects concurrent booking attempts; run the integration test against MongoDB to verify the race case. |

### M5 — Admission & Discharge Management (8)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M5_01` | Admission allocates a currently available bed in the Department → Ward → Room → Bed hierarchy. |
| `UT_M5_02` | Occupied/reserved/unavailable beds cannot be allocated to another admission. |
| `UT_M5_03` | Treatment/procedure entries can be saved against an active admission. |
| `UT_M5_04` | Discharge requires a non-empty summary and releases the linked bed. |
| `IT_M5_01` | Bed becomes Available immediately after discharge. |
| `IT_M5_02` | Discharge generates itemised room charges using the room's daily rate and stay duration. |
| `ST_M5_01` | Admission, patient clinical history, bed state and room-charge bill are linked through the same patient/admission workflow. |
| `ST_M5_02` | Missing discharge summary blocks discharge with a validation response. |

### M6 — Billing & Payment Management (9)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M6_01` | Staff creates an invoice for a patient with server-calculated line totals. |
| `UT_M6_02` | Multiple consultation/lab/medicine/treatment items are aggregated into one bill. |
| `UT_M6_03` | Payment stores amount, mode and timestamp and updates outstanding balance. |
| `UT_M6_04` | Partial payment results in `Partially Paid` and retains the correct balance due. |
| `UT_M6_05` | Zero, negative and over-balance payment amounts are rejected. |
| `IT_M6_01` | Generated patient bills appear in the Patient billing history. |
| `IT_M6_02` | Admission room charges are created as bill line items at discharge. |
| `ST_M6_01` | Payment history and receipt/print view are available; verify the actual print dialog in a browser. |
| `ST_M6_02` | Reports aggregate recorded payment amounts and outstanding balances over a date range. |

### M7 — Notification & Reminder Management (8)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M7_01` | Upcoming appointment reminder is derived for the in-app notification list. |
| `UT_M7_02` | Scheduled lab test appears in the reminder list. |
| `UT_M7_03` | Unpaid/partially paid bill nearing its due date appears as a reminder. |
| `UT_M7_04` | A source appointment/test/bill produces one derived reminder entry per API response, rather than duplicate persisted jobs. |
| `IT_M7_01` | Rescheduling updates the reminder time based on the appointment's current schedule. |
| `IT_M7_02` | Cancelled appointment is excluded from pending reminders. |
| `ST_M7_01` | Appointment, lab and bill reminder types are combined and sorted chronologically in the notification view. |
| `ST_M7_02` | Patient/Doctor/Staff notification queries are role-scoped. |

**Scope boundary:** these are derived, in-app reminders. There is no background scheduler, persisted notification-delivery record, email, or SMS transport. If the submitted test plan expects an actual scheduled push/email delivery, that part is not implemented.

### M8 — Report Management (9)

| Test IDs | Implemented workflow |
|---|---|
| `UT_M8_01` | Patient report supports selected date range. |
| `UT_M8_02` | Doctor report counts appointments assigned to a selected Doctor over a period. |
| `UT_M8_03` | Appointment report filters by Booked/Confirmed/Completed/Cancelled status. |
| `UT_M8_04` | Lab-test report filters tests conducted/requested in a selected date period. |
| `UT_M8_05` | Payment report sums recorded payments over the selected period. |
| `IT_M8_01` | Reports query current persisted records, so newly created appointments appear on the next report request. |
| `IT_M8_02` | Report result rows can be exported as CSV. |
| `ST_M8_01` | Admission report aggregates admission/discharge data and links to the bed/room workflow. |
| `ST_M8_02` | Date filters accept a 12-month range; response-time performance on a production-sized dataset still needs benchmarking. |

## Automated checks run in this workspace

The supplied sample login aliases are `admin01` / `Admin@123`, `drsmith` / `Doctor@123`, and `reception01` / `Recep@123`. During patient account activation, choose `patient01` and set `Pat@1234` (or choose another username/password); the activation is rejected unless the patient already exists in hospital records.

Last recorded command:

```bash
cd backend
node --test test/*.test.js
```

Result: **36 passed, 0 failed, 1 skipped** (37 total). The skipped test is the opt-in MongoDB-backed integration test. A separate static source check parsed all 32 frontend JS/JSX files and verified local imports; every backend JavaScript file passed `node --check`. The frontend Vite production build and browser-based manual tests were not executed in this offline environment. Run the steps in `FINAL_VERIFICATION_CHECKLIST.md` before marking the corresponding PDF `Test Result` cells as Pass.
