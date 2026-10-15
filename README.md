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
| Sprint 1 | 19 – 23 Oct 2026 | ⏳ Upcoming |
| Sprint 2 | 26 – 30 Oct 2026 | ⏳ Upcoming |

> Update this table as each phase is completed.

## ✨ Features

Taken from the [SRS](Documents/SRSdocument.docx):

| ID | Feature | Summary |
|---|---|---|
| FR-1 | Authentication & Roles | Login for Admin, Doctor, Receptionist and Patient, with role-specific dashboards |
| FR-2 | Patient & Medical Records | Register patients; manage history, diagnosis, treatment and prescriptions |
| FR-3 | Doctors & Departments | Manage doctors, specializations, availability, and department assignment |
| FR-4 | Appointments | Book, reschedule and cancel appointments based on doctor availability |
| FR-5 | Admission & Discharge | Admit patients, allocate rooms/beds, track treatment, discharge |
| FR-6 | Billing & Payments | Generate bills for services and record payments |
| FR-7 | Notifications | Reminders for appointments, tests and payments |
| FR-8 | Reports | Reports on patients, doctors, appointments, admissions, lab tests and payments |

**Non-functional requirements (NFR-1 to NFR-10):** Security, Performance, Reliability, Availability, Usability, Scalability, Maintainability, Data Integrity, Backup & Recovery, Compatibility.

## 🧑‍⚕️ User Roles

| Role | Responsibilities |
|---|---|
| **Admin** | Manages doctors, departments and reports |
| **Doctor** | Manages medical records, prescriptions and treatments |
| **Receptionist** | Handles patient registration, appointments, admissions and billing |
| **Patient** | Books and views appointments and their own records |

## 📁 Repository Structure

```
Hospital-Management-System/
├── Documents/
│   ├── SRSdocument.docx               # Software Requirements Specification (FR & NFR)
│   ├── testPlanDocument.docx          # Unit, integration and system test cases
│   ├── useCaseDiagram.jpeg            # Use case diagram (actors and interactions)
│   ├── useCaseFlowDocumentation.docx  # Main, alternate and exception flows
│   └── README.md                      # Notes on the documents
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── user_story.md              # Template for backlog items
├── backlog.csv                        # Product backlog with story points and sprint plan
└── README.md
```

> Source code folders will be added during Sprint 1 and Sprint 2.

## 🗂️ Project Management

We manage the backlog with **GitHub Issues** and a **GitHub Project board**.

- **Backlog:** 34 items created from the FR and NFR in the SRS (see [`backlog.csv`](backlog.csv)).
- **Story points:** Fibonacci scale (1, 2, 3, 5, 8) on each item.
- **Sprints:** tracked using milestones (`Sprint 1`, `Sprint 2`) and the Project's Sprint field.
- **Labels:** `FR`, `NFR`, `story`, `task`, `deliverable`, `sprint-1`, `sprint-2`, `SP-<points>`.

| Sprint | Dates | Focus |
|---|---|---|
| Sprint 1 | 19 – 23 Oct 2026 | Login & roles, patient records, doctors & departments, appointments, GitHub Actions, security and validation |
| Sprint 2 | 26 – 30 Oct 2026 | Admission/discharge, billing, notifications, reports, remaining NFRs, documentation |

📋 **Project board:** _add link here_

## 🔄 Development Workflow

1. Pick an issue assigned to you from the Project board.
2. Create a branch from `main`, for example `feature/US-05-register-patient`.
3. Commit your changes with clear messages.
4. Open a **pull request** to `main` and write `Closes #<issue-number>` in the description.
5. GitHub Actions runs automatically on the PR.
6. The repo owner reviews and merges the PR.
7. The issue closes and the card moves to **Done** on the board.

## 🛠️ Tech Stack

_To be filled in once finalized (frontend, backend, database)._

## ▶️ Getting Started

_Setup and run instructions will be added as the code is developed in Sprint 1._

## 🧪 Testing

Test cases for each module (Login, Patient Records, Doctors, Appointments, Admission/Discharge, Billing, Notifications, Reports) are in [`Documents/testPlanDocument.docx`](Documents/testPlanDocument.docx).

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
| [Use Case Flow](Documents/useCaseFlowDocumentation.docx) | Step-by-step flows for each use case |
| SAD | _add after uploading to `Documents/`_ |

Any deviations from the submitted documents will be recorded and explained at the final demo.
