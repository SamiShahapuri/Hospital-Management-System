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
| **Doctor** | Manages medical records, prescriptions and treatments |
| **Receptionist** | Handles patient registration, appointments, admissions and billing |
| **Patient** | Registers an account, books/reschedules/cancels their own appointments, and views their own medical records |

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
├── frontend/
├── VideoDemo/
│   └── login.mp4
└── README.md
```

> Sprint 1 source code includes authentication, patient/doctor/department management and appointment booking. Sprint 2 adds admission/discharge, clinical history and billing APIs with dashboard forms.

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
npm install
npm run seed
npm run dev
```

### Run the frontend (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to the API at `http://localhost:5000/api`. Configure `VITE_API_URL` in a frontend `.env` file if your API runs elsewhere. The backend uses `HOSPITAL_TIME_ZONE` for scheduling and defaults to `Asia/Kolkata`. Use demo data only; do not enter real patient information. The included seed credentials and fallback JWT secret are for local demonstrations only and must be replaced before any deployment.

## 🧪 Testing

The submitted test cases are in [`Documents/testPlanDocument.pdf`](Documents/testPlanDocument.pdf). Automated backend checks run with `cd backend && npm test`; CI also checks JavaScript syntax and builds the frontend.

## 🎥 Demo Videos

| Sprint | Video |
|---|---|
| Sprint 1 (1 min) | _add link/file here after Sprint 1_ |
| Sprint 2 (2 min) | _add link/file here after Sprint 2_ |

## 📄 Documentation

| Document | Purpose |
|---|---|
| [SRS](Documents/SRSdocument.docx) | Functional and non-functional requirements |
| [Test Plan](Documents/testPlanDocument.docx) | Test cases per module |
| [Use Case Diagram](Documents/useCaseDiagram.jpeg) | Actors and their interactions with the system |
| [Use Case Flow](Documents/useCaseFlowDocumentation.pdf) | Step-by-step flows for each use case |
| SAD | [System Architecture Document](Documents/README.md) — verify against the originally submitted SAD before final submission |

Any deviations from the submitted documents will be recorded and explained at the final demo.


## Sprint 2 API notes

- **Admissions:** `GET/POST /api/admissions` and `PATCH /api/admissions/:id/discharge`. A partial unique index protects each room/bed while occupied.
- **Clinical history:** `POST /api/patients/:id/history` accepts `diagnosis`, `treatment`, and an optional `note`; the author and timestamp are recorded.
- **Billing:** `GET/POST /api/billing`, `PATCH /api/billing/:id/pay`, and `PATCH /api/billing/:id/cancel`. Line totals and subtotal are computed server-side.
- **Patient self-service:** `POST /api/auth/register` creates a Patient account and linked profile. Patient appointment listing, booking, cancellation, and own-record reads are scoped to that linked profile.
- **Appointment management:** book, reschedule and cancel appointments; the partial unique index ensures one `Booked` appointment per doctor and exact slot. Conflicts return HTTP 409. Availability uses `HOSPITAL_TIME_ZONE` (default `Asia/Kolkata`).
- **Reports:** `GET /api/reports/summary` returns Admin-only counts and paid/outstanding billing totals.
- **In-app notifications:** `GET /api/notifications` creates current reminders from appointments in the next 24 hours and unpaid bills for authorized staff. These are dashboard reminders, not email/SMS delivery.

These modules are an academic demonstration, not a production clinical or financial system. Add deployment secrets, email verification, audit review, backups, and production security review before real use.
