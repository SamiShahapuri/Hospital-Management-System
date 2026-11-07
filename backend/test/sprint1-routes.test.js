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
  assert.ok(model.includes('partialFilterExpression: { status: "Admitted", bed: null }'));
  assert.ok(model.includes('partialFilterExpression: { status: "Admitted", bed: { $type: "objectId" } }'));
  assert.ok(routes.includes("This bed is already occupied"));
  assert.ok(routes.includes('admission.status = "Discharged"'));
});

test("clinical records persist diagnosis, treatment, author, and timestamp", () => {
  const model = source("../src/models/Patient.js");
  const routes = source("../src/routes/patients.js");
  assert.ok(model.includes("age:"));
  assert.ok(model.includes("gender:"));
  assert.ok(model.includes("dosage:"));
  assert.ok(model.includes("frequency:"));
  assert.ok(model.includes("duration:"));
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
  assert.ok(model.includes('enum: ["Unpaid", "Partially Paid", "Paid", "Cancelled"]'));
  assert.ok(model.includes('amountPaid: { type: Number'));
  assert.ok(model.includes('paymentHistory: ['));
  assert.ok(routes.includes("normalizeBillItems(items)"));
  const validation = source("../src/utils/validation.js");
  assert.ok(validation.includes("lineTotal = Math.round"));
  assert.ok(routes.includes('bill.status = bill.balanceDue <= 0.001 ? "Paid" : "Partially Paid"'));
  assert.ok(routes.includes("Payment exceeds the outstanding balance"));
  assert.ok(routes.includes("Only unpaid or partially paid bills can accept another payment"));
});

test("patient account activation requires an existing staff-created hospital record", () => {
  const auth = source("../src/routes/auth.js");
  const patients = source("../src/routes/patients.js");
  const appointments = source("../src/routes/appointments.js");
  assert.ok(auth.includes("Patient.findOne(patientMatch)"));
  assert.ok(auth.includes("patientId,"));
  assert.ok(auth.includes("No matching hospital record was found"));
  assert.ok(auth.includes("findOneAndUpdate("));
  assert.ok(auth.includes("Atomically claim the record"));
  assert.ok(patients.includes("const patientId = `PT-${randomBytes(3)"));
  assert.ok(patients.includes("possibleDuplicate"));
  assert.ok(patients.includes("You can only view your own patient record"));
  assert.ok(patients.includes("patientId: { $regex: escaped"));
  assert.ok(patients.includes("Enter a valid age between 0 and 120"));
  assert.ok(patients.includes("phone: { $regex: escaped"));
  assert.ok(patients.includes("email: { $regex: escaped"));
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

test("frontend exposes independent role-protected routes and workflow pages", () => {
  const app = source("../../frontend/src/App.jsx");
  const api = source("../../frontend/src/api.js");
  const doctorDashboard = source("../../frontend/src/pages/doctor/DoctorDashboard.jsx");
  const patientDashboard = source("../../frontend/src/pages/patient/PatientDashboard.jsx");
  const guestBooking = source("../../frontend/src/pages/public/GuestBookingPage.jsx");
  const routes = [
    'path="/admin"', 'path="appointments"', 'path="wards"', 'path="rooms"', 'path="beds"',
    'path="admissions"', 'path="/receptionist"', 'path="/doctor/appointments"',
    'path="/patient/records"', 'path="/book-appointment"'
  ];
  routes.forEach(route => assert.ok(app.includes(route), `Missing route ${route}`));
  assert.ok(app.includes("RoleRoute"));
  assert.ok(app.includes("WorkspaceLayout"));
  assert.ok(doctorDashboard.includes("saveRecord"));
  assert.ok(doctorDashboard.includes("AvailabilityEditor"));
  assert.ok(patientDashboard.includes('api("/billing")'));
  assert.ok(patientDashboard.includes("saveReschedule"));
  assert.ok(guestBooking.includes('api("/public/booking-options")'));
  assert.ok(app.includes('from "./pages/doctor/DoctorDashboard.jsx"'));
  assert.ok(app.includes('from "./pages/patient/PatientDashboard.jsx"'));
  assert.ok(app.includes('from "./pages/public/GuestBookingPage.jsx"'));
  assert.ok(api.includes("error.status = response.status"));
});

test("facility hierarchy and appointment scheduling workflows are mounted", () => {
  const server = source("../src/server.js");
  const facility = source("../src/routes/facility.js");
  const admissions = source("../src/routes/admissions.js");
  const appointments = source("../src/routes/appointments.js");
  assert.ok(server.includes('app.use("/api/facility", facilityRoutes)'));
  assert.ok(facility.includes('router.post("/wards"'));
  assert.ok(facility.includes('router.post("/rooms"'));
  assert.ok(facility.includes('router.patch("/beds/:id/status"'));
  assert.ok(admissions.includes('router.patch("/:id/transfer"'));
  assert.ok(admissions.includes('admission.status = "Discharged"'));
  assert.ok(appointments.includes('"Confirmed"'));
  assert.ok(appointments.includes('"No-show"'));
  assert.ok(appointments.includes("durationMinutes"));
});

test("reports, lab test workflows and in-app notifications are mounted and role protected", () => {
  const server = source("../src/server.js");
  const reports = source("../src/routes/reports.js");
  const notifications = source("../src/routes/notifications.js");
  const labTests = source("../src/routes/labTests.js");
  const labModel = source("../src/models/LabTest.js");
  assert.ok(server.includes('app.use("/api/notifications", notificationRoutes)'));
  assert.ok(server.includes('app.use("/api/reports", reportRoutes)'));
  assert.ok(reports.includes('allowRoles("Admin")'));
  assert.ok(reports.includes("outstandingAmount"));
  assert.ok(notifications.includes("Appointment reminder"));
  assert.ok(notifications.includes('req.user.role === "Admin" || req.user.role === "Receptionist"'));
});


test("separate Doctor and Patient sign-in portals exist and route to their own workspaces", () => {
  const app = source("../../frontend/src/App.jsx");
  const guards = source("../../frontend/src/routes/RoleRoute.jsx");
  assert.ok(app.includes('path="/doctor/login"'));
  assert.ok(app.includes('path="/patient/login"'));
  assert.ok(app.includes('allowedRoles={["Doctor"]}'));
  assert.ok(app.includes('allowedRoles={["Patient"]}'));
  assert.ok(app.includes("/auth/register"));
  assert.ok(app.includes("/doctor/login"));
  assert.ok(guards.includes('"/doctor/login"'));
  assert.ok(guards.includes('"/patient/login"'));
});

test("new doctor profile must create a Doctor-role login account", () => {
  const routes = source("../src/routes/doctors.js");
  const page = source("../../frontend/src/pages/admin/DoctorsPage.jsx");
  assert.ok(routes.includes("bcrypt.hash(password, 12)"));
  assert.ok(routes.includes('role: "Doctor"'));
  assert.ok(routes.includes("linkedUser: account._id"));
  assert.ok(page.includes("Doctor login email"));
  assert.ok(page.includes("Initial password"));
});

test("six seeded departments use medical illustrations", () => {
  const seed = source("../seed.js");
  const model = source("../src/models/Department.js");
  const page = source("../../frontend/src/pages/admin/DepartmentsPage.jsx");
  ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology", "General Medicine"].forEach(name => assert.ok(seed.includes(name)));
  ["heart", "brain", "bone", "child", "skin", "stethoscope"].forEach(icon => assert.ok(seed.includes(`icon: "${icon}"`)));
  assert.ok(model.includes('enum: ["heart", "brain", "bone", "child", "skin", "stethoscope"]'));
  assert.ok(page.includes("DepartmentIllustration"));
});

test("login locks an account after five consecutive invalid passwords", () => {
  const model = source("../src/models/User.js");
  const auth = source("../src/routes/auth.js");
  assert.ok(model.includes("failedLoginAttempts"));
  assert.ok(model.includes("lockUntil"));
  assert.ok(auth.includes("user.failedLoginAttempts >= 5"));
  assert.ok(auth.includes("15 * 60 * 1000"));
});

test("admission workflow stores treatments, requires a discharge summary and generates room charges", () => {
  const model = source("../src/models/Admission.js");
  const route = source("../src/routes/admissions.js");
  const bill = source("../src/models/Bill.js");
  assert.ok(model.includes("treatments:"));
  assert.ok(model.includes("dischargeSummary:"));
  assert.ok(route.includes('router.post("/:id/treatments"'));
  assert.ok(route.includes("Discharge summary is required before discharge"));
  assert.ok(route.includes("Automatically generated on patient discharge"));
  assert.ok(bill.includes("sourceAdmission:"));
});


test("logout revokes all active tokens for the user", () => {
  const auth = source("../src/routes/auth.js");
  const middleware = source("../src/middleware/auth.js");
  const user = source("../src/models/User.js");
  const app = source("../../frontend/src/App.jsx");
  assert.match(auth, /router\.post\("\/logout", authenticate/);
  assert.match(auth, /\$inc: \{ tokenVersion: 1 \}/);
  assert.match(middleware, /Number\(payload\.tokenVersion \|\| 0\) !== Number\(user\.tokenVersion \|\| 0\)/);
  assert.match(user, /tokenVersion: \{ type: Number, default: 0 \}/);
  assert.match(app, /api\("\/auth\/logout", \{ method: "POST" \}\)/);
});


test("login accepts username aliases for test-plan accounts", () => {
  const auth = source("../src/routes/auth.js");
  const user = source("../src/models/User.js");
  const seed = source("../seed.js");
  assert.match(auth, /req\.body\.username/);
  assert.match(auth, /\{ email: identifier \}, \{ username: identifier \}/);
  assert.match(user, /username: \{ type: String, lowercase: true, trim: true/);
  assert.ok(seed.includes('username: "admin01"'));
  assert.ok(seed.includes('username: "reception01"'));
  assert.ok(seed.includes('username: "drsmith"'));
  assert.ok(seed.includes('username: "patient01"'));
  assert.ok(seed.includes('DEMO_PATIENT_PASSWORD || "Pat@1234"'));
  assert.ok(seed.includes("patients[0].linkedUser = patientAccount._id"));
  assert.ok(seed.includes('"Admin@123"'));
});
