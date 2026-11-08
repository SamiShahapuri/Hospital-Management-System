# Sami — M1 Authentication Test Results

Execution date: 2026-11-08  
Tester: Sami Shahapuri  
Environment: Local Windows development environment, MongoDB test database, backend API on port 5000, Vite frontend on port 5173

This execution log records the five M1 cases assigned to Sami. The final test-plan PDF is intentionally unchanged until both parallel test batches have been reviewed.

| Test case | Test performed | Automated/API evidence | Browser evidence | Result |
|---|---|---|---|---|
| UT_M1_01 | Sign in with valid Admin credentials (`admin01`) | Login returned an Admin session; `GET /reports/summary` returned HTTP 200. | Sign-in opened `/admin/dashboard` and displayed the Admin workspace and Reports navigation. | PASS |
| UT_M1_02 | Sign in with a valid Admin username and an invalid password | Login returned HTTP 401 with `Invalid email or password`. | The login page remained open and displayed `Invalid email or password`. | PASS |
| UT_M1_03 | Submit blank username and password | Login API returned HTTP 400 with `Username/email and password are required`. | Browser validation blocked submission and displayed `Please fill out this field.` | PASS |
| IT_M1_01 | Attempt to access Admin Reports as Receptionist | Receptionist login succeeded; `GET /reports/summary` returned HTTP 403 with the permission error. | Opening `/admin/reports` redirected the Receptionist to `/receptionist/dashboard`; Reports was absent from the Receptionist navigation. | PASS |
| IT_M1_02 | Log out and reuse the previous protected session | Logout returned HTTP 200; reuse of the old token returned HTTP 401 with `Session has expired. Please sign in again.` | Opening the protected Receptionist dashboard after logout redirected to `/login`. | PASS |

## Verification summary

- M1 cases executed: 5
- Passed: 5
- Failed: 0
- Automated integration run: 7 passed, 0 failed (the five named M1 subtests plus the surrounding integration workflow)
- Unit/API regression run: 36 passed, 0 failed, 2 skipped when integration mode was not enabled

No production fix was required for these five cases. The repository change adds explicit, repeatable test-plan assertions and this execution evidence.
