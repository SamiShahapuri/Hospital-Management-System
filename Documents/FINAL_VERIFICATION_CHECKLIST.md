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

- [ ] Sign in using `admin01` / `Admin@123` and `reception01` / `Recep@123` (or their seeded email aliases).
- [ ] Sign in through `/doctor/login` using `drsmith` / `Doctor@123` or a newly created Doctor account.
- [ ] Sign in through `/patient/login` using the test-plan account `patient01` / `Pat@1234`; confirm only the linked patient record is visible.
- [ ] Confirm a Doctor created by Admin/Receptionist receives a Doctor-role account and can sign in at `/doctor/login`.
- [ ] Confirm a person without a staff-created Patient record cannot activate a Patient login.
- [ ] Register a patient as Admin/Receptionist, copy the generated Patient ID, then activate via `/patient/login` using matching ID, full name and registered email.
- [ ] Sign in as that Patient; sign out and confirm the login screen returns and the prior token is rejected by the API.
- [ ] Enter an incorrect password five times; confirm temporary account lockout is enforced.
- [ ] Try a wrong password, malformed registration details, and duplicate email; confirm useful 4xx errors.
- [ ] Send an API request without a bearer token and one with an expired/invalid token; confirm HTTP 401.
- [ ] As Patient, attempt to read another patient's record or book/reschedule/cancel another patient's appointment; confirm HTTP 403.
- [ ] Confirm Doctor cannot create bills/departments or use appointment reschedule/cancel actions; confirm allowed clinical actions work.

## Patients, doctors, and departments

- [ ] Register a patient as Admin/Receptionist with full name, age, gender, phone, registered email and address; confirm the generated Patient ID appears without a full reload and persists after refresh.
- [ ] Search for a matching patient by Patient ID, name, phone and email; search for a non-matching value and confirm the empty state is readable.
- [ ] Try invalid email, invalid phone, future date of birth, overlong strings, and a non-string value via API; confirm 400 responses.
- [ ] Confirm the six seeded illustrated departments: Cardiology (heart), Neurology (brain), Orthopedics (bone), Pediatrics (child), Dermatology (skin), and General Medicine.
- [ ] As Admin, add a department, then add a doctor assigned to it; confirm the doctor dropdown uses actual active department data.
- [ ] Try creating/updating a doctor with a non-existent department or malformed availability; confirm validation errors.
- [ ] Update/deactivate a doctor using the API and confirm it no longer appears among active doctors.

## Appointments

- [ ] Book a future appointment during a doctor's configured availability.
- [ ] Configure a doctor with a 15/20/30/45/60-minute consultation duration and confirm offered slots respect the full duration.
- [ ] Verify the schedule can be filtered by day, week, month, doctor and status; confirm Confirmed appointments remain visible.
- [ ] Confirm receptionist/admin can confirm and cancel; Admin can complete or mark no-show; Doctor can complete or mark no-show only for their own visits.
- [ ] Reschedule an appointment using the live availability list; verify an occupied slot is not offered.
- [ ] Try a past/invalid time and a time outside doctor availability; confirm 400 responses.
- [ ] Book the same doctor/time twice; confirm the second request returns HTTP 409.
- [ ] Cancel an appointment and book that exact slot again; confirm a cancelled booking does not occupy the slot.
- [ ] Reschedule a booked appointment into a free slot and into an occupied slot; verify success and 409 conflict respectively.
- [ ] Complete a booked appointment as Admin/Doctor; confirm its status changes to Completed and its actions are no longer available.

## Admissions, clinical records, billing, notifications, reports

- [ ] Admit a patient to a free room/bed, then attempt to admit another patient to the same active bed; confirm HTTP 409.
- [ ] Discharge the patient and admit another patient to the released bed.
- [ ] Create a ward under a department, create a room with a bed count, and confirm individual bed records are generated.
- [ ] Verify all bed states: Available, Reserved, Occupied, Cleaning and Under Maintenance; confirm an occupied bed cannot be manually released or reclassified.
- [ ] Transfer an admitted patient to another available bed; confirm source bed is released, destination bed is occupied, and transfer history shows both bed/room locations.
- [ ] Confirm a patient cannot have two active admissions at the same time.
- [ ] Save a diagnosis/treatment note and a prescription with medicine, dosage, frequency and duration as Doctor; refresh and confirm all structured fields persist and are visible in Patient records.
- [ ] Create a bill with multiple line items; independently calculate the expected subtotal and compare it with the server response.
- [ ] Record a partial payment and confirm the status and balance due update correctly; then pay the remainder and confirm the bill becomes Paid.
- [ ] Try a zero, negative or excessive payment; verify validation/conflict responses.
- [ ] Confirm room charges are itemised and included in the final admission bill; print the receipt view.
- [ ] Confirm upcoming appointments, scheduled lab tests and bills due soon appear as chronological, role-scoped in-app reminders; paid bills should no longer appear as due reminders.
- [ ] Reschedule/cancel an appointment and schedule/complete a lab test; confirm the reminder list reflects the latest state without duplicate entries.
- [ ] Generate a lab-test report and export it; confirm the date range and status filter affect the rows.
- [ ] Confirm the Admin report counts/revenue change when records change and that non-Admin requests are forbidden.

## Known scope boundaries

- Notifications are derived in-app dashboard reminders, not email or SMS messages. There is no external scheduled-delivery service or persistent delivery log.
- The current data model stores a doctor's department by name, not as a foreign-key reference to the department document.
- The facility hierarchy is configured by Admin: Department → Ward → Room → Bed. Room creation generates the configured individual beds; it does not import an existing hospital inventory.
- Guest bookings create a patient record and appointment without creating a patient login account. The guest receives an on-screen confirmation; there is no email/SMS confirmation.
- The MongoDB-backed integration workflow is opt-in and must use a dedicated test database. Manual browser usability, accessibility and responsive-layout checks are still required; a passing API suite/build does not replace them.
- The repository snapshot does not include the originally submitted SAD. Add it or record its separate location before the final hand-in.

## Updated doctor, patient, and guest pages

- [ ] Sign in at `/doctor/login` as the seeded Doctor; confirm the page has no sidebar and only that doctor's appointments are shown.
- [ ] As Doctor, add a clinical note and prescription for a patient from one of the doctor's appointments; confirm both persist after refresh.
- [ ] As Doctor, attempt to mark another doctor's appointment complete and open a patient unrelated to the doctor's appointments; confirm the API denies access.
- [ ] Sign in at `/patient/login` after activating an existing hospital record; confirm the page has no sidebar and only the linked patient's appointments, medical records, and prescriptions appear.
- [ ] As Patient, book, reschedule, and cancel an appointment; confirm requests are limited to the linked patient profile.
- [ ] Open **Edit profile** as Doctor and Patient; update email and phone, upload a valid image, save, and refresh to confirm persistence.
- [ ] As Patient, update the address; confirm the new address persists.
- [ ] Attempt to change name, blood group, date of birth, specialization, or department through the profile API; confirm the API rejects protected fields.
- [ ] From the sign-in screen, choose **Book as guest**; book an appointment with valid guest details during a doctor's configured working hours and confirm the confirmation page appears without signing in.
- [ ] Confirm the public booking API rejects a duplicate guest booking for the same doctor/time slot.
- [ ] Open `/doctor/profile` and `/patient/profile` directly; confirm each renders as its own page and the user workspace has no admin/reception sidebar.
- [ ] Try a guest booking outside a doctor's configured hours and a duplicate doctor/time slot; confirm the API rejects both.
