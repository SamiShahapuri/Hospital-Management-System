# Backend Code and Branch Coverage

## Executed scope

Coverage was measured with `c8 --all` against every JavaScript file under `backend/src`. The run enabled the MongoDB-backed integration suites and used the isolated database `hms_coverage_20261117`; it did not target the normal development database.

The combined run completed **53 tests: 53 passed, 0 failed, 0 skipped**. This comprises the 44 unit/source checks and 9 integration checks used by the testing assessment, including the named `SEC-AUTH-05` linkage test.

## Coverage results

| Metric | Covered | Total | Percentage |
|---|---:|---:|---:|
| Statements | 501 | 2,005 | 24.98% |
| Lines | 501 | 2,005 | 24.98% |
| Functions | 18 | 37 | 48.64% |
| Branches | 119 | 155 | 76.77% |

The detailed HTML report is available at `Code_Coverage/index.html`. The machine-readable totals are stored in `Code_Coverage/coverage-summary.json`, and the complete terminal output is stored in `Test_Execution_Logs/backend_coverage.log`.

## Reproduction

From `backend/` in PowerShell:

```powershell
$env:NODE_ENV = 'test'
$env:JWT_SECRET = 'replace-with-a-test-only-secret'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/hms_coverage_20261117'
$env:HMS_INTEGRATION_TESTS = '1'
$env:HMS_M4_INTEGRATION_TESTS = '1'
$env:HMS_M4_TEST_DATABASE_NAME = 'hms_coverage_20261117'
npm.cmd run test:coverage
```

## Interpretation and limitations

The `--all` option keeps backend source files with no parent-process instrumentation in the denominator instead of silently omitting them. This produces a conservative project-wide line percentage.

The existing HTTP integration tests start the Express server as a child process. They verify real API and MongoDB behavior, but the parent `c8` process does not merge that child server's route execution into this report. Consequently, several route files appear as 0% even though their API behavior passed integration and browser-system tests. The coverage report is therefore valid for the instrumented Node process but should not be interpreted as proof that those routes were never exercised.

Frontend line and branch percentages are not claimed. The React application currently has no frontend unit-test runner or browser-to-source coverage instrumentation; its executed evidence is the Playwright system suite and production build.
