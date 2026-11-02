# 🏥 Hospital Management System

A **Patient Record and Appointment Management System** for hospitals. It manages patients, doctors, departments, appointments, admissions, billing, notifications, and reports.

> Software Engineering Mini-Project

## 👥 Team

| Name | SRN | GitHub |
|---|---|---|
| _Member A_ | PES1UG24CS611 | Sami Shahapuri|
| _Member B_ | PES1UG24CS619 | Shahid Tahsildar |
| _Member C_ | PES1UG25CS839 | Sachin B R |

## 📌 Project Status

| Phase | Dates | Status |
|---|---|---|
| Part 1 – SRS, SAD, Test Plan, Use Cases | Completed | ✅ Done |
| Backlog creation and sprint planning | by 12 Oct 2026 | ✅ Done |
| Sprint 1 | 19 – 23 Oct 2026 | ✅ Accepted by the instructor |
| Sprint 2 | 26 – 30 Oct 2026 | 🛠️ In progress |

> Update this table as each phase is completed.

## ✨ Features

Taken from the [SRS](Documents/SRSdocument.pdf):

| ID | Feature | Summary |
|---|---|---|
| FR-1 | Authentication & Roles | Login for Admin, Doctor, Receptionist and Patient, with role-specific dashboards |
| FR-2 | Patient & Medical Records | Register patients; manage history, diagnosis, treatment and prescriptions |
| FR-3 | Doctors & Departments | Manage doctors, specializations, availability, and department assignment |
| FR-4 | Appointments | Book, reschedule and cancel appointments based on doctor availability |
| FR-5 | Admission & Discharge | Admit patients, allocate rooms/beds with active-bed conflict protection, and discharge |
| FR-6 | Billing & Payments | Create itemized bills, calculate totals, record payments and cancel unpaid bills |
| FR-7 | Notifications | Reminders for appointments, tests and payments |
| FR-8 | Reports | Reports on patients, doctors, appointments, admissions, lab tests and payments |

**Non-functional requirements (NFR-1 to NFR-10):** Security, Performance, Reliability, Availability, Usability, Scalability, Maintainability, Data Integrity, Backup & Recovery, Compatibility.

## 🧑‍⚕️ User Roles

| Role | Responsibilities |
|---|---|
| **Admin** | Manages doctors, departments and reports |
| **Doctor** | Uses a focused doctor workspace for their own appointments and patient visits; can add clinical notes and prescriptions and update contact details and profile photo |
| **Receptionist** | Handles patient registration, appointments, admissions and billing |
| **Patient** | Uses a focused patient portal to book appointments and view personal records and prescriptions; can update contact details and profile photo |

### Updated role pages

- **Admin / Receptionist:** Use route-based management workspaces with persistent navigation. Admin manages doctors, departments, wards, rooms, beds, admissions, billing and reports; Receptionist focuses on the front-desk workflows.
- **Doctor:** Uses a focused, no-sidebar workspace with separate `/doctor/dashboard`, `/doctor/appointments`, `/doctor/patients` and `/doctor/profile` pages. Doctors manage their own availability and consultation duration, complete visits, and add clinical notes and prescriptions.
- **Patient:** Uses a focused, no-sidebar portal with separate `/patient/dashboard`, `/patient/appointments`, `/patient/records`, `/patient/billing` and `/patient/profile` pages. Patients can book, reschedule and cancel their own visits.
- **Guest:** A public booking page available from the sign-in screen using **Book as guest**. Guests can choose a department, doctor, date and time without creating an account. The server checks doctor working hours and prevents a double booking of the exact slot.
- **Profile editing:** Doctors and patients can update their email, contact number and profile photo. Patients can also update their address. Name and protected identity fields (including patient blood group) are read-only in the profile screen and rejected by the profile API if a client tries to change them. Staff enter patient identity information when creating the hospital record. Profile photos accept PNG/JPG/WEBP images up to 1.5 MB.
- **Lab tests:** Admin/Receptionist can schedule tests against existing patient records, record results, complete/cancel tests, view upcoming in-app reminders, and export date-range lab reports.
- **Departments:** The demo seed activates six illustrated departments: Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology and General Medicine.

Guest bookings create a patient record and appointment but do not create a login account. The guest receives an on-screen confirmation. Photos are stored as image data in MongoDB for this academic demo; use managed file/object storage before a real deployment.

## 📁 Repository Structure

```
Hospital-Management-System/
├── .github/
│   └── workflows/
│       └── ci.yml
├── Documents/
│   ├── SRSdocument.pdf
│   ├── testPlanDocument.pdf
│   ├── useCaseDiagram.jpeg
│   ├── useCaseFlowDocumentation.pdf
│   └── README.md
├── backend/
│   ├── src/models/       # User, patient, doctor, appointment, ward, room, bed, admission, bill
│   ├── src/routes/       # Auth, clinical, scheduling, facility, admission, billing, reports
│   └── test/             # Unit/source checks and opt-in MongoDB integration suite
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/   # Page titles, stat cards and status pills
│       │   ├── layout/   # Admin/reception workspace navigation
│       │   └── role/     # Shared doctor/patient dashboard widgets
│       ├── context/      # Toast notifications
│       ├── pages/
│       │   ├── admin/    # Dashboard, appointments, patients, doctors, facilities, billing, reports
│       │   ├── doctor/   # Doctor dashboard, appointments and patients
│       │   ├── patient/  # Patient dashboard, appointments, records and bills
│       │   ├── public/   # Guest appointment booking
│       │   └── shared/   # Profile screens
│       ├── routes/       # Role route guard
│       └── utils/        # Date and currency formatting
├── VideoDemo/
│   └── login.mp4
└── README.md
```

> The refactored project includes authentication, role-based route workspaces, appointment scheduling, facility/bed management, admissions, clinical history, billing, reports and public guest booking. See the role route table and API notes below for the active implementation.

## 🗂️ Project Management

We manage the backlog with **GitHub Issues** and a **GitHub Project board**.

- **Backlog:** tracked as GitHub Issues and the [project board](https://github.com/users/SamiShahapuri/projects/3). The CSV mentioned in earlier planning notes is not present in the current repository.
- **Story points:** Fibonacci scale (1, 2, 3, 5, 8) on each item.
- **Sprints:** tracked using milestones (`Sprint 1`, `Sprint 2`) and the Project's Sprint field.
- **Labels:** `FR`, `NFR`, `story`, `task`, `deliverable`, `sprint-1`, `sprint-2`, `SP-<points>`.

| Sprint | Dates | Focus |
|---|---|---|
| Sprint 1 | 19 – 23 Oct 2026 | Login & roles, patient records, doctors & departments, appointments, GitHub Actions, security and validation |
| Sprint 2 | 26 – 30 Oct 2026 | Admission/discharge, diagnosis and treatment history, billing/payment workflow, authorization hardening, responsive form polish and testing |

📋 **Project board:** [GitHub Projects — Hospital Management System](https://github.com/users/SamiShahapuri/projects/3)

## 🔄 Development Workflow

1. Pick an issue assigned to you from the Project board.
2. Create a branch from `main`, for example `feature/US-05-register-patient`.
3. Commit your changes with clear messages.
4. Open a **pull request** to `main` and write `Closes #<issue-number>` in the description.
5. GitHub Actions runs automatically on the PR.
6. The repo owner reviews and merges the PR.
7. The issue closes and the card moves to **Done** on the board.

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT and bcrypt password hashing

## ▶️ Getting Started

### Prerequisites
- Node.js 20 or newer
- MongoDB running locally or a MongoDB URI you can access

### Run the backend
```bash
cd backend
cp .env.example .env
# Edit .env and replace JWT_SECRET with a long random value.
npm install
npm run seed
npm run dev
```

### Run the frontend (in a second terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`. Staff sign in at `/login`; doctors use the dedicated `/doctor/login` page; patients use `/patient/login`. Adding a doctor from Doctor Directory creates their linked Doctor-role account. The sign-in form accepts either username or email. Demo Admin is `admin01` / `Admin@123`; Receptionist is `reception01` / `Recep@123`; Doctor Dr. Ananya Rao is `drsmith` / `Doctor@123`. Five additional Doctors use usernames `kiran.shetty`, `meera.nair`, `rahul.menon`, `asha.kulkarni`, and `vivek.rao` (all use `Doctor@123`). Email aliases are also accepted; exact emails are printed by `npm run seed`.

**Patient account rule:** patients cannot create a new hospital record from the login screen. Admin/Receptionist must first register the person in Patient Records and share the generated Patient ID. The patient then opens `/patient/login`, chooses **First time here? Activate account using your Patient ID**, and enters the Patient ID, full name, exact registered email, a username and a password. The `npm run seed` output prints the IDs and emails for the three sample patient records. Seeded patients do not have login accounts until activated.

The frontend defaults to the API at `http://localhost:5000/api`. Configure `VITE_API_URL` in `frontend/.env` if the API runs elsewhere. The backend uses `HOSPITAL_TIME_ZONE` for scheduling and defaults to `Asia/Kolkata`. Use demo data only; do not enter real patient information. These credentials and the fallback JWT secret are for local demonstrations only and must be replaced before any deployment. On Windows PowerShell, use `Copy-Item .env.example .env` if `cp` is not available.

## 🧪 Testing

The submitted test cases are in [`Documents/testPlanDocument.pdf`](Documents/testPlanDocument.pdf). The implementation mapping is documented in [`Documents/TEST_PLAN_COVERAGE.md`](Documents/TEST_PLAN_COVERAGE.md). Automated backend checks run with `cd backend && npm test`. CI runs the API against a dedicated MongoDB service, checks JavaScript syntax, and builds the frontend. To run the HTTP integration suite locally, make sure MongoDB is running and point `MONGODB_URI` at a separate test database (not your working app database), set `HMS_INTEGRATION_TESTS=1`, then run `npm run test:integration` from `backend`. In PowerShell, for example: `$env:MONGODB_URI='mongodb://127.0.0.1:27017/hms_integration_test'; $env:HMS_INTEGRATION_TESTS='1'; npm.cmd run test:integration`. See [`Documents/FINAL_VERIFICATION_CHECKLIST.md`](Documents/FINAL_VERIFICATION_CHECKLIST.md) for the remaining manual workflow checks.

## 🎥 Demo Videos

| Sprint | Video |
|---|---|
| Login demo | [`VideoDemo/login.mp4`](VideoDemo/login.mp4) |
| Other workflows | Record and add patient, doctor, appointment, admission, and billing demos before final submission. |

## 📄 Documentation

| Document | Purpose |
|---|---|
| [SRS](Documents/SRSdocument.pdf) | Functional and non-functional requirements |
| [Test Plan](Documents/testPlanDocument.pdf) | Test cases per module |
| [Use Case Diagram](Documents/useCaseDiagram.jpeg) | Actors and their interactions with the system |
| [Use Case Flow](Documents/useCaseFlowDocumentation.pdf) | Step-by-step flows for each use case |
| SAD | [System Architecture Document](Documents/README.md) — verify against the originally submitted SAD before final submission |

Any deviations from the submitted documents will be recorded and explained at the final demo.


## Sprint 2 API notes

- **Admissions:** `GET/POST /api/admissions` and `PATCH /api/admissions/:id/discharge`. A partial unique index protects each room/bed while occupied.
- **Clinical history:** `POST /api/patients/:id/history` accepts `diagnosis`, `treatment`, and an optional `note`; the author and timestamp are recorded.
- **Billing:** `GET/POST /api/billing`, `PATCH /api/billing/:id/pay`, and `PATCH /api/billing/:id/cancel`. Line totals and subtotal are computed server-side.
- **Patient account activation:** `POST /api/auth/register` activates an account only when the supplied Patient ID, full name, and email match an existing record created by Admin/Receptionist. It never creates a new hospital patient record. Patient appointments, booking, cancellation, and record reads are scoped to the linked profile.
- **Appointment management:** book, confirm, reschedule, cancel, complete and mark no-show. Doctor availability is configured by weekday, working hours and consultation duration (15/20/30/45/60 minutes). The API returns actual available slots, checks the entire consultation window against working hours and existing appointments, and returns HTTP 409 for overlapping bookings. A per-minute unique slot index protects concurrent bookings for both `Booked` and `Confirmed` visits. Availability uses `HOSPITAL_TIME_ZONE` (default `Asia/Kolkata`).
- **Facility / bed management:** Admin creates the hierarchy `Department → Ward → Room → Bed`. A room generates its individual bed records. Beds support `Available`, `Reserved`, `Occupied`, `Cleaning` and `Under Maintenance`; only the admission workflow can mark a bed occupied. Admission allocates a tracked bed, discharge releases it, and transfer records the source/destination bed history. Legacy room/bed text admissions remain readable for older records.
- **Route-based frontend:** Admin routes are `/admin/dashboard`, `/admin/appointments`, `/admin/patients`, `/admin/doctors`, `/admin/departments`, `/admin/wards`, `/admin/rooms`, `/admin/beds`, `/admin/admissions`, `/admin/billing` and `/admin/reports`. Receptionist routes are `/receptionist/dashboard`, `/receptionist/appointments`, `/receptionist/patients` and `/receptionist/admissions`. Doctor and Patient routes are listed above. Guest booking is public at `/book-appointment`. Role guards protect the private workspaces.
- **Reports:** `GET /api/reports/summary` returns Admin-only counts and paid/outstanding billing totals.
- **In-app notifications:** `GET /api/notifications` derives in-app reminders from upcoming appointments, scheduled lab tests, and bills due soon (including partially paid balances). Reminders are role-scoped and chronological; there is no email/SMS delivery or external scheduler.

These modules are an academic demonstration, not a production clinical or financial system. Add deployment secrets, email verification, audit review, backups, and production security review before real use.
