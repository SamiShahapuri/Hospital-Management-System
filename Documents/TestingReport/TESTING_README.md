# Hospital Management System - Testing Evidence

Execution date: 11 November 2026 (Asia/Calcutta)

This directory contains the executed testing evidence and university-submission artifacts for the Hospital Management System. Results are based on commands and browser checks actually run in an isolated local environment; unexecuted cases are identified rather than treated as passes.

## Delivered artifacts

- `Software_Testing_Report.pdf` - formal assessment, evidence, defect report, traceability, and limitations.
- `Test_Cases.xlsx` - test register with Unit Tests, Integration Tests, System Tests, Defect Log, and Overall Summary sheets.
- `Test_Execution_Logs/` - captured unit, integration, syntax, build, and browser-system outputs.
- `Screenshots/` - genuine Playwright screenshots produced during the system run.
- `scripts/system-tests.mjs` - repeatable Playwright browser test script.

## Results

| Testing type | Total | Passed | Failed | Blocked | Not executed |
|---|---:|---:|---:|---:|---:|
| Unit | 44 | 44 | 0 | 0 | 0 |
| Integration | 8 | 8 | 0 | 0 | 0 |
| System | 32 | 12 | 0 | 0 | 20 |
| Overall | 84 | 64 | 0 | 0 | 20 |

The executed-scope pass rate is 100% (64/64). The full planned-matrix pass percentage is 76.2% (64/84), because 20 requested manual/UI scenarios were not executed. The three tests reported as skipped by `npm test` are opt-in integration bootstrap files; they are excluded from the 44-test unit total and were executed by the dedicated integration command.

## Environment

- Windows 10.0.26300, Node.js 22.20.0, npm 10.9.3
- MongoDB 8.2.1 running as a Windows service
- Chrome 157.0.8103.50 and Playwright 1.62.1
- React 18.3.1 / Vite 6.4.5; Express 4.21.2 / Mongoose 8.9.5
- Integration database: `hms_testing_report_20261111`
- System database: `hms_system_testing_20261111`

Neither test database is the normal development or production database.

## Reproducing automated checks

Run commands from the repository root in PowerShell. Use `npm.cmd` if local execution policy prevents `npm.ps1` from running.

### Unit tests

```powershell
Set-Location backend
npm.cmd install
npm.cmd test
```

Expected final result: 47 discovered, 44 passed, 0 failed, and 3 opt-in integration files skipped.

### Integration tests

Start MongoDB, then use a dedicated database and enable the opt-in suites:

```powershell
Set-Location backend
$env:NODE_ENV = 'test'
$env:JWT_SECRET = 'replace-with-a-test-only-secret'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/hms_testing_report_20261111'
$env:RUN_INTEGRATION_TESTS = '1'
$env:RUN_M4_INTEGRATION_TESTS = '1'
$env:RUN_REMINDER_INTEGRATION_TESTS = '1'
npm.cmd run test:integration
```

Expected final result: 8 passed and 0 failed. The tests create and verify persisted records, then clean their own isolated data.

### Backend syntax and frontend production build

```powershell
Set-Location backend
Get-ChildItem src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }

Set-Location ../frontend
npm.cmd install
npm.cmd run build
```

The recorded final build transformed 61 modules and completed successfully.

### Browser system tests

Start the backend and frontend in separate terminals:

```powershell
Set-Location backend
$env:PORT = '5200'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/hms_system_testing_20261111'
$env:CLIENT_ORIGIN = 'http://localhost:5174'
$env:JWT_SECRET = 'replace-with-a-test-only-secret'
$env:NODE_ENV = 'test'
npm.cmd start
```

```powershell
Set-Location frontend
$env:VITE_API_URL = 'http://localhost:5200/api'
npm.cmd run dev -- --port 5174
```

Before starting the backend, seed the isolated system database with the repository's local demo fixtures:

```powershell
Set-Location backend
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/hms_system_testing_20261111'
npm.cmd run seed
```

The browser script uses the local-only default seed credentials printed by that command. Then run from the repository root:

```powershell
node Documents/TestingReport/scripts/system-tests.mjs
```

The script expects Chrome at its standard Windows installation path. Its final execution produced 12 passes, 0 failures, 11 screenshots, and no uncaught page errors or invalid-pattern browser errors.

## Defects resolved during testing

1. A patient could supply another patient identifier to the billing endpoint and read data outside their scope. The route now returns HTTP 403 and has an integration regression assertion.
2. Doctor and Patient dashboards crashed because `PageHeader` was not exported/imported correctly. The shared component and both dashboard imports were corrected.
3. Username and telephone HTML patterns were invalid under modern browser Unicode-sets (`v`) semantics. The patterns were corrected and verified in the final browser regression.
4. The Admission schema declared the bed index twice, causing a Mongoose warning. The redundant declaration was removed while retaining the partial unique active-bed index.

## Known limitations

Twenty UI/manual scenarios remain marked NOT EXECUTED in the workbook and report. They include complete ward/room/bed UI CRUD, admission and discharge UI workflows, billing/payment UI mutation, receptionist appointment workflows, doctor consultation/clinical update workflows, patient appointment/profile mutation, browser print-dialog verification, simultaneous human-session contention, and a large 12-month production-volume benchmark.

No claim is made for penetration-test certification, accessibility conformance, cross-browser coverage, disaster recovery, or production-scale load performance. The browser run used Chrome only. Expected console entries caused by intentionally rejected 401/404 requests and network-blocked external resources were retained in the JSON evidence; the final run had no uncaught page error.
