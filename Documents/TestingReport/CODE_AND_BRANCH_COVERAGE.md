# Backend Code and Branch Coverage

## Assessment summary

| Coverage dimension | Result | Evidence-based interpretation |
|---|---:|---|
| Submitted functional test-plan coverage | **72/72 (100%)** | Every case in `Documents/testPlanDocument.pdf` was executed and passed. |
| Backend branch coverage | **77.27%** | 119 of 154 instrumented branches were exercised. |
| Backend function coverage | **48.64%** | 18 of 37 instrumented functions were exercised in the parent process. |
| Backend line/statement coverage | **24.93%** | Conservative `c8 --all` result; child-process API execution is not merged into the parent coverage map. |

Functional test-plan coverage and source-code instrumentation coverage measure different things and must not be combined into one percentage. The project achieved complete execution of the submitted functional test plan while the reproducible backend branch-coverage result is 77.27%.

## Executed scope

Coverage was measured with `c8 --all` against every JavaScript file under `backend/src`. The run enabled the MongoDB-backed integration suites and used the isolated database `hms_coverage_20261119`; it did not target the normal development database.

The combined run completed **71 tests: 71 passed, 0 failed, 0 skipped**. This includes the unit/source checks and all enabled MongoDB-backed integration assertions, including the named `SEC-AUTH-05` linkage test and the 17-case test-plan completion suite.

## Coverage results

| Metric | Covered | Total | Percentage |
|---|---:|---:|---:|
| Statements | 501 | 2,009 | 24.93% |
| Lines | 501 | 2,009 | 24.93% |
| Functions | 18 | 37 | 48.64% |
| Branches | 119 | 154 | 77.27% |

The detailed HTML report is available at `Code_Coverage/index.html`. The machine-readable totals are stored in `Code_Coverage/coverage-summary.json`, and the complete terminal output is stored in `Test_Execution_Logs/coverage_tests.log`.

## Backend per-file coverage

These values are copied from the executed `coverage-summary.json`; they are not estimates.

| Backend source file | Lines | Branches | Functions |
|---|---:|---:|---:|
| `server.js` | 0% | 0% | 0% |
| `middleware/auth.js` | 42.30% | 100% | 50% |
| `models/Admission.js` | 100% | 100% | 100% |
| `models/Appointment.js` | 100% | 100% | 100% |
| `models/AppointmentReminder.js` | 100% | 100% | 100% |
| `models/Bed.js` | 100% | 100% | 100% |
| `models/Bill.js` | 100% | 100% | 100% |
| `models/Department.js` | 100% | 100% | 100% |
| `models/Doctor.js` | 100% | 100% | 100% |
| `models/LabTest.js` | 0% | 0% | 0% |
| `models/Patient.js` | 100% | 100% | 100% |
| `models/Room.js` | 0% | 0% | 0% |
| `models/User.js` | 100% | 100% | 100% |
| `models/Ward.js` | 0% | 0% | 0% |
| `routes/admissions.js` | 0% | 0% | 0% |
| `routes/appointments.js` | 27.01% | 87.50% | 60% |
| `routes/auth.js` | 0% | 0% | 0% |
| `routes/billing.js` | 0% | 0% | 0% |
| `routes/departments.js` | 0% | 0% | 0% |
| `routes/doctors.js` | 25.52% | 75% | 50% |
| `routes/facility.js` | 0% | 0% | 0% |
| `routes/labTests.js` | 0% | 0% | 0% |
| `routes/notifications.js` | 0% | 0% | 0% |
| `routes/patients.js` | 0% | 0% | 0% |
| `routes/public.js` | 0% | 0% | 0% |
| `routes/reports.js` | 0% | 0% | 0% |
| `services/appointmentReminderScheduler.js` | 0% | 0% | 0% |
| `services/appointmentReminders.js` | 88.42% | 70.37% | 100% |
| `utils/profileValidation.js` | 100% | 85.29% | 100% |
| `utils/validation.js` | 100% | 92.10% | 100% |

The route files showing 0% were executed through the spawned Express child process during integration and browser testing, but that child-process coverage was not merged into the parent `c8` map.

## Frontend file coverage status

Frontend source-level percentages are **not measured** because the repository has no React source-coverage instrumentation. The following files are exercised at workflow level by the 16/16 passing Playwright system suite, but assigning per-file percentages would be unsupported:

`api.js`, `App.jsx`, `main.jsx`, `style.css`, `AvailabilityEditor.jsx`, `PageTitle.jsx`, `StatCard.jsx`, `StatusPill.jsx`, `DepartmentIllustration.jsx`, `WorkspaceLayout.jsx`, `RoleWidgets.jsx`, `ToastContext.jsx`, `AdmissionsPage.jsx`, `AppointmentsPage.jsx`, `BedsPage.jsx`, `BillingPage.jsx`, `DashboardPage.jsx`, `DepartmentsPage.jsx`, `DoctorsPage.jsx`, `LabTestsPage.jsx`, `PatientsPage.jsx`, `ReportsPage.jsx`, `DoctorAppointmentsPage.jsx`, `DoctorDashboard.jsx`, `DoctorPatientsPage.jsx`, `PatientAppointmentsPage.jsx`, `PatientBillsPage.jsx`, `PatientDashboard.jsx`, `PatientRecordsPage.jsx`, `GuestBookingPage.jsx`, `ProfilePage.jsx`, `RoleRoute.jsx`, and `format.js`.

## Whole-project summary

| Measure | Verified result |
|---|---:|
| Submitted functional test-plan execution | **72/72 passed (100%)** |
| Automated unit checks | **44 passed, 0 failed** |
| Automated integration assertions | **27 passed, 0 failed** |
| Automated browser-system scenarios | **16 passed, 0 failed** |
| Backend branch coverage | **77.27%** |
| Backend line/statement coverage | **24.93%** |
| Frontend source coverage | **Not instrumented; no percentage claimed** |

## Reproduction

From `backend/` in PowerShell:

```powershell
$env:NODE_ENV = 'test'
$env:JWT_SECRET = 'replace-with-a-test-only-secret'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/hms_coverage_20261119'
$env:HMS_INTEGRATION_TESTS = '1'
$env:HMS_M4_INTEGRATION_TESTS = '1'
$env:HMS_M4_TEST_DATABASE_NAME = 'hms_coverage_20261119'
npm.cmd run test:coverage
```

## Interpretation and limitations

The `--all` option keeps backend source files with no parent-process instrumentation in the denominator instead of silently omitting them. This produces a conservative project-wide line percentage.

The existing HTTP integration tests start the Express server as a child process. They verify real API and MongoDB behavior, but the parent `c8` process does not merge that child server's route execution into this report. Consequently, several route files appear as 0% even though their API behavior passed integration and browser-system tests. The coverage report is therefore valid for the instrumented Node process but should not be interpreted as proof that those routes were never exercised.

Frontend line and branch percentages are not claimed. The React application currently has no frontend unit-test runner or browser-to-source coverage instrumentation; its executed evidence is the Playwright system suite and production build.
