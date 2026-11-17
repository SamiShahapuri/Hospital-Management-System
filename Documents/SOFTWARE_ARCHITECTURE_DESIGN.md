# Hospital Management System Software Architecture and Design

**Version:** 1.0  
**Status:** As-built baseline  
**Date:** 17 November 2026  
**Project:** Software Engineering Mini-Project

## 1. Purpose

This document describes the architecture that is implemented in the Hospital Management System repository. It provides a common reference for developers, testers, evaluators, and maintainers and links the requirements in the SRS to the deployed software structure.

The system is a three-tier web application: a React single-page frontend calls an Express REST API, and the API persists operational data in MongoDB through Mongoose models. Authentication uses JSON Web Tokens and role-based authorization for Admin, Receptionist, Doctor, and Patient accounts. Guest users can access only the public appointment-booking endpoints.

## 2. Architecture goals and constraints

The design prioritizes:

- clear separation between the user interface, API routes, domain models, and persistence;
- role-scoped access to patient, clinical, appointment, admission, and billing information;
- database-enforced protection against overlapping appointment slots and duplicate active bed allocations;
- server-side validation and calculation of security-sensitive or financial values;
- repeatable local development and testing using synthetic data;
- responsive browser access for the academic demonstration environment.

This repository is an academic system and is not approved for real clinical data or production hospital use. Production deployment, disaster recovery, external identity management, and regulatory certification are outside the current implemented baseline.

## 3. System context

| Actor | Primary interaction |
|---|---|
| Admin | Manages doctors, departments, facilities, admissions, billing, reports, and staff-level workflows. |
| Receptionist | Registers patients, manages appointments and admissions, and records billing activity. |
| Doctor | Views assigned appointments and permitted patient records, records clinical history and prescriptions, and manages availability. |
| Patient | Activates an account linked to an existing hospital record, manages personal appointments, and views personal records and bills. |
| Guest | Reads public booking options and submits an appointment request without receiving a login account. |

## 4. Logical architecture

```text
Browser
  |
  | HTTPS in a production deployment; HTTP for local development
  v
React and Vite frontend
  |
  | JSON over REST under /api
  v
Express application
  |-- authentication and authorization middleware
  |-- route and workflow handlers
  |-- validation and reminder services
  v
Mongoose data-access layer
  |
  v
MongoDB database
```

### 4.1 Frontend

The frontend is a React 18 application built with Vite. `frontend/src/App.jsx` defines the route structure. Role guards prevent a user from entering a frontend workspace intended for another role, while backend authorization remains the authoritative access control.

The principal frontend areas are:

- `pages/admin` for administrative and reception workflows;
- `pages/doctor` for doctor dashboards, appointments, and assigned patients;
- `pages/patient` for patient appointments, records, billing, and dashboard views;
- `pages/public` for guest appointment booking;
- `pages/shared` for role-scoped profile editing;
- `components` for shared layout, status, availability, and dashboard widgets;
- `api.js` for API communication and bearer-token handling.

### 4.2 Backend

The backend is a Node.js ES module application using Express. `backend/src/server.js` configures JSON parsing, CORS, the health endpoint, route registration, error handling, MongoDB connection, and the appointment-reminder scheduler.

| API area | Base path | Responsibility |
|---|---|---|
| Public | `/api/public` | Public booking options, availability, and guest appointment creation. |
| Authentication | `/api/auth` | Patient account activation, login, logout, and current-user lookup. |
| Patients | `/api/patients` | Patient registration, profile access, clinical history, and prescriptions. |
| Doctors | `/api/doctors` | Doctor accounts, profiles, availability, and directory operations. |
| Departments | `/api/departments` | Department lifecycle and dependency checks. |
| Appointments | `/api/appointments` | Booking, rescheduling, cancellation, confirmation, completion, and no-show states. |
| Facilities | `/api/facility` | Wards, rooms, beds, capacity, and bed status. |
| Admissions | `/api/admissions` | Admission, treatment, transfer, discharge, and room-charge generation. |
| Billing | `/api/billing` | Itemized bills, payments, balances, and cancellation. |
| Laboratory | `/api/lab-tests` | Test scheduling, status, result recording, and role-scoped retrieval. |
| Notifications | `/api/notifications` | Derived and scheduled in-app reminders. |
| Reports | `/api/reports` | Admin summaries and detailed report data. |

### 4.3 Persistence

MongoDB is accessed through Mongoose. The implemented collections and principal relationships are:

| Model | Principal relationships and rules |
|---|---|
| User | Stores credentials, role, account-lock state, and token version. |
| Patient | May link to one Patient-role User; owns clinical history and prescriptions. |
| Doctor | May link to one Doctor-role User; stores availability and consultation duration. |
| Department | Groups doctors and facility wards. |
| Appointment | References one Patient and Doctor; active minute-slot keys are uniquely indexed per Doctor. |
| Ward | Belongs to a Department and defines capacity. |
| Room | Belongs to a Ward and defines room type, bed count, and daily rate. |
| Bed | Belongs to a Room and records operational status. |
| Admission | References a Patient and optional tracked Bed; only one active allocation can occupy a Bed. |
| Bill | References a Patient and optional Admission; stores calculated items, payments, and balances. |
| LabTest | References a Patient and requesting user. |
| AppointmentReminder | Stores scheduled appointment reminder state. |

Doctor departments are currently stored by name in the Doctor model rather than by a Department object identifier. This is an intentional documented limitation of the current baseline.

## 5. Authentication and authorization design

Passwords are hashed with bcrypt. Successful login returns a signed JWT containing the user identity, role, and token version. Authenticated requests use the `Authorization: Bearer <token>` header. Logout increments the stored token version, invalidating previously issued tokens.

The backend uses two middleware controls:

- `authenticate` validates the token and loads the current user;
- `allowRoles` rejects authenticated users whose role is not authorized for the route.

Routes also apply record-level restrictions. Examples include limiting a Patient to the linked patient record, limiting a Doctor to patients associated with that Doctor's appointments, and restricting reports to Admin.

Frontend route guards improve usability but do not replace backend authorization.

## 6. Key workflow designs

### 6.1 Patient registration and activation

An Admin or Receptionist first creates the hospital Patient record. The Patient can then activate a login only when the Patient ID, full name, and registered email match that record. Activation links the new User to the existing Patient and does not create a second clinical record.

### 6.2 Appointment booking

Doctor availability and consultation duration determine offered slots. The API validates future time, working hours, ownership, and role. Each active appointment stores minute-level slot keys. A unique MongoDB index prevents two active appointments from occupying overlapping minutes for the same Doctor, including concurrent requests.

### 6.3 Admission and bed allocation

Facilities follow Department to Ward to Room to Bed. Admission atomically changes an eligible Bed to Occupied and creates the Admission. A partial unique index prevents two active Admissions from referencing the same Bed. Transfer reserves the destination before releasing the source. Discharge requires a summary, releases the Bed, and may generate an itemized room-charge Bill.

### 6.4 Billing and payment

The API calculates line totals and subtotal from quantity and unit price. Payment operations reject zero, negative, or over-balance amounts and update payment history, amount paid, balance due, and bill status. Patients can retrieve only bills linked to their own Patient record.

### 6.5 Notifications

The system provides in-app reminders for appointments, lab tests, and bills. Appointment reminder scheduling is started with the backend. The current baseline does not provide email, SMS, or a durable external notification-delivery service.

## 7. Runtime configuration

The backend requires a MongoDB URI and JWT secret. `CLIENT_ORIGIN` restricts browser CORS access, `HOSPITAL_TIME_ZONE` controls appointment-time interpretation, and `PORT` selects the API port. The frontend uses `VITE_API_URL` for the API base URL.

Development defaults and demo credentials are not suitable for deployment. Production must supply a strong secret, a protected database, HTTPS termination, backups, monitoring, and a reviewed origin configuration.

## 8. Error handling and data integrity

The API returns JSON errors with suitable 4xx responses for invalid input, authentication failure, authorization failure, missing records, and conflicts. Unexpected exceptions are logged server-side and returned as a generic internal-server-error response.

Important database integrity controls include:

- unique email and username values for users;
- unique Patient IDs;
- unique linked Doctor account;
- unique active Doctor slot-minute keys;
- unique active Bed allocation;
- unique Admission-generated Bill relationship;
- dependency checks before Department, Ward, or Room deactivation.

## 9. Testing architecture

Backend unit and source-wiring tests use the Node.js test runner. MongoDB-backed integration suites are opt-in and must point to a dedicated test database. Browser system tests use Playwright against isolated backend and frontend ports and databases. GitHub Actions provides backend syntax checks, unit tests, integration tests, and a frontend production build.

Executed results and limitations are maintained in `TestingReport/TESTING_README.md`. Implementation mapping is maintained in `TEST_PLAN_COVERAGE.md`; it must not be interpreted as evidence that an unexecuted test passed.

## 10. Deployment view and limitations

The verified deployment target is local academic demonstration. The repository does not yet provide production Docker definitions, an HTTPS reverse proxy, database migrations, automated backup and restore, external monitoring, or clinical compliance certification.

Profile images are stored as data in MongoDB for the academic demo. A production design should use controlled object storage. Only synthetic data may be used with the current baseline.

## 11. Architecture decisions

| Decision | Reason | Consequence |
|---|---|---|
| React single-page application | Supports role-focused interactive workflows. | Requires JavaScript and a separately running API during development. |
| Express REST API | Small, familiar HTTP service for the mini-project. | Domain logic currently resides mainly in route handlers. |
| MongoDB and Mongoose | Flexible document modelling and index-based conflict protection. | Schema evolution is not managed by a formal migration framework. |
| JWT with token version | Stateless request authentication with server-side logout invalidation. | Tokens must be protected in the browser and secrets rotated for deployment. |
| Database unique indexes for scarce resources | Protects appointment slots and beds under concurrent requests. | Index creation must be verified in each deployed database. |
| In-app notifications | Meets the demonstrated reminder scope without external services. | Email and SMS delivery are not implemented. |

## 12. Related documents

- `SRSdocument.pdf` - submitted functional and non-functional requirements.
- `SECURITY_REQUIREMENTS.md` - security objectives, controls, and verification mapping.
- `testPlanDocument.pdf` - submitted test plan.
- `TEST_PLAN_COVERAGE.md` - as-built implementation mapping.
- `TestingReport/Software_Testing_Report.pdf` - executed testing assessment.
- `FINAL_VERIFICATION_CHECKLIST.md` - remaining manual verification checklist.

