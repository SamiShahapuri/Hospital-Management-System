# Hospital Management System Security Requirements

**Project:** Software Engineering Mini-Project

## 1. Purpose and scope

This document defines the security requirements for the Hospital Management System and records whether each requirement is implemented, partially implemented, or planned. It covers the React frontend, Express API, MongoDB data store, local demonstration environment, and CI workflow.

The current application is an academic demonstration. It must use synthetic data only and must not be represented as certified for clinical, privacy, security, or regulatory compliance.

## 2. Assets and trust boundaries

The main assets are:

- user credentials and authenticated sessions;
- patient identity and contact details;
- medical history, diagnoses, treatments, prescriptions, and laboratory results;
- appointment and doctor-availability data;
- admission, room, and bed allocation data;
- bills, payment history, and report data;
- application secrets and database connection information;
- test evidence and system logs.

The primary trust boundaries are the browser-to-API connection, API-to-MongoDB connection, public guest-booking surface, authenticated role boundaries, and development/CI-to-production configuration boundary.

## 3. Threat summary

The security baseline considers:

- credential guessing and account takeover;
- forged, expired, or reused authentication tokens;
- privilege escalation between Admin, Receptionist, Doctor, and Patient roles;
- access to another Patient's medical or billing data;
- access by a Doctor to unrelated Patient records;
- duplicate appointment or bed allocation caused by concurrent requests;
- invalid or manipulated financial data;
- injection or malformed input;
- exposure of secrets or sensitive data in source, responses, or logs;
- unsafe production configuration;
- loss or corruption of stored data.

## 4. Security requirements

### 4.1 Authentication

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-AUTH-01 | Passwords shall be stored only as salted cryptographic hashes. | Implemented with bcrypt. | Authentication unit/source tests and code review. |
| SEC-AUTH-02 | Login shall accept only a valid username or email and password combination. | Implemented. | Unit and browser invalid-login tests. |
| SEC-AUTH-03 | Repeated failed login attempts shall cause temporary account lockout. | Implemented at five failures. | Unit and manual verification checklist. |
| SEC-AUTH-04 | Patient account activation shall require a matching existing Patient ID, name, and registered email. | Implemented. | Unit and integration tests. |
| SEC-AUTH-05 | Doctor accounts shall be linked to Doctor profiles created through an authorized staff workflow. | Implemented. | Integration and manual workflow tests. |
| SEC-AUTH-06 | Production startup shall require an explicitly supplied JWT secret. | Implemented. | Configuration/source verification. |
| SEC-AUTH-07 | Password recovery and email ownership verification shall use a secure out-of-band process. | Not implemented. | Future production requirement. |

### 4.2 Session management

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-SES-01 | Protected API requests shall require a valid signed JWT. | Implemented. | Unit, integration, and negative API tests. |
| SEC-SES-02 | Invalid or expired JWTs shall return HTTP 401 without protected data. | Implemented. | Unit and manual negative tests. |
| SEC-SES-03 | Logout shall invalidate previously issued tokens. | Implemented with token versioning. | Unit/source checks and manual verification. |
| SEC-SES-04 | Tokens shall be transmitted only over HTTPS outside local development. | Deployment requirement; not supplied by this repository. | Production deployment review. |
| SEC-SES-05 | Browser token storage shall be reviewed against XSS and session-lifetime requirements before production. | Partially implemented; formal review pending. | Security review. |

### 4.3 Authorization and privacy

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-AUTHZ-01 | Every protected API area shall authenticate the request before processing it. | Implemented. | Route/source checks and integration tests. |
| SEC-AUTHZ-02 | Role-restricted operations shall return HTTP 403 to unauthorized authenticated users. | Implemented. | Authorization unit/integration tests. |
| SEC-AUTHZ-03 | A Patient shall access only the Patient record linked to that account. | Implemented. | Patient-scope integration regression. |
| SEC-AUTHZ-04 | A Patient shall access only personal appointments, records, prescriptions, lab tests, and bills. | Implemented in API filtering. | Integration and browser tests. |
| SEC-AUTHZ-05 | A Doctor shall access clinical records only for Patients associated with that Doctor's appointments. | Implemented. | Authorization tests and manual negative test. |
| SEC-AUTHZ-06 | Administrative reports shall be restricted to Admin. | Implemented. | Route tests and manual verification. |
| SEC-AUTHZ-07 | Frontend route guards shall not be treated as the authoritative authorization control. | Implemented as an architecture rule. | Backend route review. |
| SEC-AUTHZ-08 | Sensitive actions shall produce a durable audit trail identifying actor, action, target, and time. | Not implemented as a general audit log. | Future requirement. |

### 4.4 Input validation and integrity

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-VAL-01 | Required fields, identifiers, email, phone, password, dates, and enumerations shall be validated server-side. | Implemented for principal workflows. | Domain-validation unit tests and API tests. |
| SEC-VAL-02 | Unexpected object fields shall not permit protected profile or identity changes. | Implemented for Doctor and Patient profile APIs. | Profile validation tests. |
| SEC-VAL-03 | Database identifiers shall be validated before queries that expect an object identifier. | Implemented for principal routes. | Unit/source and negative API tests. |
| SEC-VAL-04 | API errors shall not return stack traces or database internals to clients. | Implemented through centralized error handling. | Source and negative API tests. |
| SEC-INT-01 | Active appointment slots shall be protected against duplicate and overlapping booking. | Implemented with validation and a unique minute-slot index. | M4 integration test and conflict tests. |
| SEC-INT-02 | Active Bed allocation shall be unique and conflicting allocation shall return HTTP 409. | Implemented with atomic status changes and a partial unique index. | Integration and system tests. |
| SEC-INT-03 | Bill line totals and subtotal shall be calculated by the server. | Implemented. | Billing unit and integration tests. |
| SEC-INT-04 | Payment shall reject zero, negative, non-finite, and over-balance values. | Implemented. | Domain-validation tests. |
| SEC-INT-05 | Discharge shall require a summary and shall release the allocated Bed. | Implemented. | Unit/integration and manual tests. |

### 4.5 Application and API protection

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-APP-01 | Browser access shall be restricted to the configured client origin. | Implemented with CORS configuration. | Configuration review. |
| SEC-APP-02 | JSON request size shall be bounded. | Implemented with a 4 MB limit. | Source review. |
| SEC-APP-03 | Public guest booking shall expose only the data required to select and create an appointment. | Implemented. | Public API review and system test. |
| SEC-APP-04 | Authentication and public booking endpoints shall be rate-limited. | Not implemented. | Future security hardening. |
| SEC-APP-05 | CSRF risk shall be assessed against the selected token transport and production architecture. | Partially addressed by bearer tokens; formal review pending. | Security review. |
| SEC-APP-06 | Dependencies shall be scanned for known vulnerabilities in CI. | Not implemented in CI. | Future CI requirement. |
| SEC-APP-07 | Repository content and commits shall be scanned for secrets in CI. | Not implemented in CI. | Future CI requirement. |

### 4.6 Data protection and operations

| ID | Requirement | Baseline status | Verification |
|---|---|---|---|
| SEC-DATA-01 | Real patient or clinical data shall not be entered into the academic environment. | Required operating rule. | README, training, and demonstration review. |
| SEC-DATA-02 | Production database access shall use restricted credentials and protected network access. | Not supplied by the academic deployment. | Production review. |
| SEC-DATA-03 | Database connections, API traffic, and backups shall be encrypted in transit and at rest for production. | Not supplied by the academic deployment. | Production review. |
| SEC-DATA-04 | Backups shall be automated, access-controlled, retained, and periodically restored in a test environment. | Not implemented. | Future backup and restore drill. |
| SEC-DATA-05 | Retention and deletion periods shall be defined for clinical, billing, authentication, and log data. | Not defined. | Policy approval and implementation. |
| SEC-DATA-06 | Large profile images and uploaded files shall use controlled object storage before production. | Not implemented; images are stored in MongoDB for the demo. | Architecture review. |
| SEC-DATA-07 | Logs and API responses shall not contain passwords, JWTs, password hashes, or unnecessary clinical data. | Partially verified; exhaustive log review pending. | Security regression review. |

## 5. Role-permission matrix

`R` means read, `C` create, `U` update, `D` delete or deactivate, and `Own` means access is restricted to the linked account or assigned relationship.

| Resource or operation | Admin | Receptionist | Doctor | Patient | Guest |
|---|---|---|---|---|---|
| Department | R/C/U/D | R | R | R | Booking options only |
| Doctor profile and directory | R/C/U/D | R/C/U | Own profile and availability | R | Booking options only |
| Patient record | R/C/U | R/C/U | Assigned R; assigned clinical C | Own R; limited own U | None |
| Clinical history and prescription | R/C | R | Assigned R/C | Own R | None |
| Appointment | R/C/U | R/C/U | Assigned R; complete/no-show | Own R/C/reschedule/cancel | Create only |
| Ward, Room, and Bed | R/C/U/D | R/C/U/D | Admission-related R | None | None |
| Admission and discharge | R/C/U | R/C/U | Assigned-patient R/C/U | None | None |
| Bill and payment | R/C/U | R/C/U | None | Own R | None |
| Laboratory test | R/C/U | R/C/U | Assigned R/C/U | Own R | None |
| Notification | Role-scoped R/run job | Role-scoped R/run job | Own/assigned R | Own R | None |
| Reports | R | None | None | None | None |

## 6. Security verification mapping

| Evidence | Coverage |
|---|---|
| Backend unit tests | Credential validation, input boundaries, authorization wiring, billing, admission, appointment, notification, and profile rules. |
| MongoDB integration tests | Authentication and persistence, patient scope, appointment conflicts, reminders, and API status/body behavior. |
| Browser system tests | Invalid login, role dashboards, CRUD workflows, reports, guest booking, and mobile guest layout. |
| GitHub Actions | Backend syntax, unit tests, MongoDB-backed integration tests, and frontend production build. |
| Manual checklist | Remaining UI workflows, expired-token checks, cross-role negative cases, print behavior, and concurrency demonstrations. |

Executed counts and limitations are recorded in `TestingReport/TESTING_README.md`. Requirements marked partially implemented or not implemented must not be reported as passed security controls.

## 7. Security acceptance criteria

The current academic baseline is acceptable for submission when:

1. all automated security-related regression tests pass;
2. unexecuted manual security cases remain clearly identified;
3. only synthetic data is used;
4. demo secrets are not used for a public deployment;
5. known production gaps are disclosed rather than described as implemented.

Production acceptance additionally requires HTTPS, protected secret management, rate limiting, audit logging, dependency and secret scanning, backup and restore evidence, monitoring, retention rules, and an independent security review.

## 8. Related documents

- `SOFTWARE_ARCHITECTURE_DESIGN.md` - system structure and architecture decisions.
- `SRSdocument.pdf` - submitted functional and non-functional requirements.
- `testPlanDocument.pdf` - submitted test cases.
- `TEST_PLAN_COVERAGE.md` - implemented requirement-to-test mapping.
- `TestingReport/Software_Testing_Report.pdf` - executed test results and limitations.

