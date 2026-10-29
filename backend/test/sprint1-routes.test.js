import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = (relativePath) => fs.readFileSync(path.resolve(here, relativePath), "utf8");

test("server registers the doctor, department and appointment APIs", () => {
  const server = source("../src/server.js");
  assert.match(server, /app\.use\("\/api\/doctors", doctorRoutes\)/);
  assert.match(server, /app\.use\("\/api\/departments", departmentRoutes\)/);
  assert.match(server, /app\.use\("\/api\/appointments", appointmentRoutes\)/);
});

test("doctor endpoints require authentication and role checks", () => {
  const routes = source("../src/routes/doctors.js");
  assert.match(routes, /router\.use\(authenticate\)/);
  assert.match(routes, /allowRoles\("Admin", "Receptionist"\)/);
  assert.match(routes, /validAvailability/);
  assert.match(routes, /Doctor\.findByIdAndUpdate/);
});

test("department endpoints validate names and handle duplicate departments", () => {
  const routes = source("../src/routes/departments.js");
  assert.match(routes, /Department name is required/);
  assert.match(routes, /error\?\.code === 11000/);
  assert.match(routes, /allowRoles\("Admin"\)/);
});

test("appointment endpoints validate future times and prevent duplicate booked slots", () => {
  const routes = source("../src/routes/appointments.js");
  assert.match(routes, /date <= new Date\(\)/);
  assert.match(routes, /Doctor already has an appointment at this time/);
  assert.match(routes, /appointment\.status = "Cancelled"/);
  assert.match(routes, /Only booked appointments can be cancelled/);
});

test("doctor and appointment schemas include persistence and indexes", () => {
  const doctor = source("../src/models/Doctor.js");
  const appointment = source("../src/models/Appointment.js");
  assert.match(doctor, /timestamps: true/);
  assert.match(doctor, /doctorSchema\.index/);
  assert.match(appointment, /ref: "Patient"/);
  assert.match(appointment, /ref: "Doctor"/);
  assert.match(appointment, /appointmentSchema\.index/);
});

test("admissions endpoints validate occupied beds and discharge only active admissions", () => {
  const server = source("../src/server.js");
  const model = source("../src/models/Admission.js");
  const routes = source("../src/routes/admissions.js");
  assert.match(server, /app\\.use\\("\\/api\\/admissions", admissionRoutes\\)/);
  assert.match(model, /partialFilterExpression: \\{ status: "Admitted" \\}/);
  assert.match(routes, /This bed is already occupied/);
  assert.match(routes, /status: "Discharged", dischargedAt: new Date\\(\\)/);
});

test("clinical records persist diagnosis, treatment, author, and timestamp", () => {
  const model = source("../src/models/Patient.js");
  const routes = source("../src/routes/patients.js");
  assert.match(model, /diagnosis:/);
  assert.match(model, /treatment:/);
  assert.match(model, /recordedBy:/);
  assert.match(routes, /Enter a diagnosis, treatment, or clinical note/);
  assert.match(routes, /recordedBy: req\\.user\\.id/);
});

test("billing API validates line items and supports payment state transitions", () => {
  const server = source("../src/server.js");
  const model = source("../src/models/Bill.js");
  const routes = source("../src/routes/billing.js");
  assert.match(server, /app\\.use\\("\\/api\\/billing", billingRoutes\\)/);
  assert.match(model, /enum: \\["Unpaid", "Paid", "Cancelled"\\]/);
  assert.match(routes, /lineTotal = Math\\.round/);
  assert.match(routes, /status: "Paid", paidAt: new Date\\(\\)/);
  assert.match(routes, /Only unpaid bills can be marked as paid/);
});

test("patient self-registration creates a profile and patient appointment access is scoped", () => {
  const auth = source("../src/routes/auth.js");
  const patients = source("../src/routes/patients.js");
  const appointments = source("../src/routes/appointments.js");
  assert.match(auth, /Patient\\.findOneAndUpdate/);
  assert.match(patients, /You can only view your own patient record/);
  assert.match(appointments, /You can only book appointments for your own patient profile/);
  assert.match(appointments, /You can only cancel your own appointments/);
});

test("appointment database index prevents concurrent active-slot duplicates", () => {
  const model = source("../src/models/Appointment.js");
  const routes = source("../src/routes/appointments.js");
  assert.match(model, /unique: true, partialFilterExpression: \\{ status: "Booked" \\}/);
  assert.match(routes, /error\\.code === 11000/);
  assert.match(routes, /timeZone: hospitalTimeZone/);
});
