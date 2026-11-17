# Sami - M1 Authentication Test Results

- Execution date: 2026-11-17
- Tester: Sami Shahapuri
- Environment: Local Windows development environment, MongoDB test database, backend API on port 5000, Vite frontend on port 5173

This execution log records the five assigned M1 cases and the explicit `SEC-AUTH-05` security traceability test.

| Test case | Test performed | Automated/API evidence | Browser evidence | Result |
|---|---|---|---|---|
| UT_M1_01 | Sign in with valid Admin credentials (`admin01`) | Login returned an Admin session; `GET /reports/summary` returned HTTP 200. | Sign-in opened `/admin/dashboard` and displayed the Admin workspace and Reports navigation. | PASS |
| UT_M1_02 | Sign in with a valid Admin username and an invalid password | Login returned HTTP 401 with `Invalid email or password`. | The login page remained open and displayed `Invalid email or password`. | PASS |
| UT_M1_03 | Submit blank username and password | Login API returned HTTP 400 with `Username/email and password are required`. | Browser validation blocked submission and displayed `Please fill out this field.` | PASS |
| IT_M1_01 | Attempt to access Admin Reports as Receptionist | Receptionist login succeeded; `GET /reports/summary` returned HTTP 403 with the permission error. | Opening `/admin/reports` redirected the Receptionist to `/receptionist/dashboard`; Reports was absent from the Receptionist navigation. | PASS |
| IT_M1_02 | Log out and reuse the previous protected session | Logout returned HTTP 200; reuse of the old token returned HTTP 401 with `Session has expired. Please sign in again.` | Opening the protected Receptionist dashboard after logout redirected to `/login`. | PASS |
| SEC-AUTH-05 | Verify that only authorized staff can create a Doctor account and that the resulting Doctor profile is linked to that account | A Doctor-role request to `POST /doctors` returned HTTP 403. A Receptionist request returned HTTP 201. The test asserted `doctor.linkedUser === createdDoctorAccount.user.id`, logged in with the generated Doctor credentials, and confirmed `/doctors/me/profile` returned the same Doctor profile and linked user. | `ST-ADMIN-DOCTOR-01` created the Doctor profile and login through the Admin UI; the browser execution log and `04-doctors-after-crud.png` record PASS. | PASS |

## Verification summary

- Authentication/security cases executed: 6
- Passed: 6
- Failed: 0
- Dedicated integration run: 9 passed, 0 failed, including the named `SEC-AUTH-05` database-link test
- Unit/source regression includes `new doctor profile must create a Doctor-role login account`

No production fix was required. The repository change adds a direct, repeatable authorization and database-link assertion for `SEC-AUTH-05`.
