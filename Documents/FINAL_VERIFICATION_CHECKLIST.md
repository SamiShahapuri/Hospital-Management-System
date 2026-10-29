# Final Verification Checklist

Use a local demo database only. Do not enter real patient or clinical data. Record the date, tester, result, and any issue number for each manual test.

## Environment and pipeline

- [ ] Use Node.js 20 or newer and start MongoDB.
- [ ] Copy `backend/.env.example` to `backend/.env`; set a local-only random `JWT_SECRET`.
- [ ] From `backend/`, run `npm install`, `npm test`, and `npm run seed`.
- [ ] Start the API with `npm run dev`; verify `GET http://localhost:5000/api/health` returns `{"status":"ok","service":"hms-api"}`.
- [ ] From `frontend/`, run `npm install`, `npm run build`, and `npm run dev`.
- [ ] Verify browser DevTools shows no uncaught errors and failed API requests have useful error messages.
- [ ] Verify the GitHub Actions backend test and frontend build jobs both pass for the fix branch/PR.

## Authentication and access control

- [ ] Sign in with the seeded Admin and Receptionist credentials from the root README / seed output.
- [ ] Sign in with a registered Patient account; sign out and confirm the login screen returns.
- [ ] Try a wrong password, malformed registration details, and duplicate email; confirm useful 4xx errors.
- [ ] Send an API request without a bearer token and one with an expired/invalid token; confirm HTTP 401.
- [ ] As Patient, attempt to read another patient's record or book/reschedule/cancel another patient's appointment; confirm HTTP 403.
- [ ] Confirm Doctor cannot create bills/departments or use appointment reschedule/cancel actions; confirm allowed clinical actions work.

## Patients, doctors, and departments

- [ ] Register a patient as Admin/Receptionist; confirm the patient appears without a full browser reload and persists after refresh.
- [ ] Search for a matching patient and a non-matching name; confirm the empty state is readable.
- [ ] Try invalid email, invalid phone, future date of birth, overlong strings, and a non-string value via API; confirm 400 responses.
- [ ] As Admin, add a department, then add a doctor assigned to it; confirm the doctor dropdown uses actual active department data.
- [ ] Try creating/updating a doctor with a non-existent department or malformed availability; confirm validation errors.
- [ ] Update/deactivate a doctor using the API and confirm it no longer appears among active doctors.

## Appointments

- [ ] Book a future appointment during a doctor's configured availability.
- [ ] Try a past/invalid time and a time outside doctor availability; confirm 400 responses.
- [ ] Book the same doctor/time twice; confirm the second request returns HTTP 409.
- [ ] Cancel an appointment and book that exact slot again; confirm a cancelled booking does not occupy the slot.
- [ ] Reschedule a booked appointment into a free slot and into an occupied slot; verify success and 409 conflict respectively.
- [ ] Complete a booked appointment as Admin/Doctor; confirm its status changes to Completed and its actions are no longer available.

## Admissions, clinical records, billing, notifications, reports

- [ ] Admit a patient to a free room/bed, then attempt to admit another patient to the same active bed; confirm HTTP 409.
- [ ] Discharge the patient and admit another patient to the released bed.
- [ ] Save a diagnosis/treatment note and prescription as Doctor; refresh and confirm persistence.
- [ ] Create a bill with multiple line items via API; independently calculate the expected subtotal and compare it with the server response.
- [ ] Pay an unpaid bill once; try paying it again and cancelling it afterward; verify invalid state transitions return a conflict.
- [ ] Confirm upcoming appointments and unpaid bills appear as in-app reminders for authorized staff; paid bills should no longer appear as unpaid reminders.
- [ ] Confirm the Admin report counts/revenue change when records change and that non-Admin requests are forbidden.

## Known scope boundaries

- Notifications are in-app dashboard reminders, not email or SMS messages.
- The current data model stores a doctor's department by name, not as a foreign-key reference to the department document.
- The room/bed model prevents two active admissions from sharing a room/bed, but it does not define a preconfigured inventory of valid rooms or beds.
- CI runs source-wiring checks, validation unit tests, and a MongoDB-backed HTTP integration workflow covering authentication, role restrictions, patient persistence, doctors/departments, appointment conflicts and lifecycle, admissions/discharge, clinical records, billing transitions, notifications, and reports. Manual browser usability and responsive-layout checks are still required; a passing API suite/build does not replace them.
- The repository snapshot does not include the originally submitted SAD. Add it or record its separate location before the final hand-in.
