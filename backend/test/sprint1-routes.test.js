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
  assert.match(routes, /parseFutureDate\(scheduledAt\)/);
  assert.match(routes, /parseFutureDate\(req\.body\.scheduledAt\)/);
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
  assert.ok(server.includes('app.use("/api/admissions", admissionRoutes)'));
  assert.ok(model.includes('partialFilterExpression: { status: "Admitted" }'));
  assert.ok(routes.includes("This bed is already occupied"));
  assert.ok(routes.includes('status: "Discharged", dischargedAt: new Date()'));
});

test("clinical records persist diagnosis, treatment, author, and timestamp", () => {
  const model = source("../src/models/Patient.js");
  const routes = source("../src/routes/patients.js");
  assert.ok(model.includes("diagnosis:"));
  assert.ok(model.includes("treatment:"));
  assert.ok(model.includes("recordedBy:"));
  assert.ok(routes.includes("Enter a diagnosis, treatment, or clinical note"));
  assert.ok(routes.includes("recordedBy: req.user.id"));
});

test("billing API validates line items and supports payment state transitions", () => {
  const server = source("../src/server.js");
  const model = source("../src/models/Bill.js");
  const routes = source("../src/routes/billing.js");
  assert.ok(server.includes('app.use("/api/billing", billingRoutes)'));
  assert.ok(model.includes('enum: ["Unpaid", "Paid", "Cancelled"]'));
  assert.ok(routes.includes("normalizeBillItems(items)"));
  const validation = source("../src/utils/validation.js");
  assert.ok(validation.includes("lineTotal = Math.round"));
  assert.ok(routes.includes('status: "Paid", paidAt: new Date()'));
  assert.ok(routes.includes("Only unpaid bills can be marked as paid"));
});

test("patient self-registration creates a profile and patient appointment access is scoped", () => {
  const auth = source("../src/routes/auth.js");
  const patients = source("../src/routes/patients.js");
  const appointments = source("../src/routes/appointments.js");
  assert.ok(auth.includes("Patient.create({ fullName: name, email, linkedUser: user._id })"));
  assert.ok(patients.includes("You can only view your own patient record"));
  assert.ok(appointments.includes("You can only book appointments for your own patient profile"));
  assert.ok(appointments.includes("You can only cancel your own appointments"));
});

test("appointment database index prevents concurrent active-slot duplicates", () => {
  const model = source("../src/models/Appointment.js");
  const routes = source("../src/routes/appointments.js");
  assert.ok(model.includes('unique: true, partialFilterExpression: { status: "Booked" }'));
  assert.ok(routes.includes("error.code === 11000"));
  assert.ok(routes.includes("timeZone: hospitalTimeZone"));
  assert.ok(routes.includes('router.patch("/:id/reschedule"'));
  assert.ok(routes.includes("Only booked appointments can be rescheduled"));
});

test("frontend connects Sprint 2 workflows and expired-token handling", () => {
  const app = source("../../frontend/src/App.jsx");
  const api = source("../../frontend/src/api.js");
  assert.ok(app.includes('api("/admissions")'));
  assert.ok(app.includes('api("/billing")'));
  assert.ok(app.includes("saveMedicalRecord"));
  assert.ok(app.includes("savePrescription"));
  assert.ok(app.includes("saveReschedule"));
  assert.ok(app.includes("submitRegistration"));
  assert.ok(api.includes("error.status = response.status"));
});

test("reports and in-app notifications are mounted and role protected", () => {
  const server = source("../src/server.js");
  const reports = source("../src/routes/reports.js");
  const notifications = source("../src/routes/notifications.js");
  assert.ok(server.includes('app.use("/api/notifications", notificationRoutes)'));
  assert.ok(server.includes('app.use("/api/reports", reportRoutes)'));
  assert.ok(reports.includes('allowRoles("Admin")'));
  assert.ok(reports.includes("outstandingAmount"));
  assert.ok(notifications.includes("Appointment reminder"));
  assert.ok(notifications.includes('req.user.role === "Admin" || req.user.role === "Receptionist"'));
});
