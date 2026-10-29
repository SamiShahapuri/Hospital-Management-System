import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, "..");
const enabled = process.env.HMS_INTEGRATION_TESTS === "1";
const port = Number(process.env.HMS_TEST_PORT || 5100);
const baseUrl = `http://127.0.0.1:${port}`;

async function request(route, { token, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}/api${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

async function login(email, password) {
  const result = await request("/auth/login", { method: "POST", body: { email, password } });
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.data)}`);
  assert.ok(result.data.token);
  return result.data;
}

function indiaDate(daysFromNow, hour, minute) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(`${values.year}-${values.month}-${values.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`).toISOString();
}

test("MongoDB-backed API workflows: authentication, records, appointments, admissions and billing", {
  skip: !enabled ? "Set HMS_INTEGRATION_TESTS=1 to run with a dedicated MongoDB test database." : false,
  timeout: 120_000
}, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to a dedicated test database");
  assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured for integration tests");

  execFileSync(process.execPath, ["seed.js"], {
    cwd: backendDir,
    env: process.env,
    stdio: "pipe",
    timeout: 45_000
  });

  const output = [];
  const server = spawn(process.execPath, ["src/server.js"], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", chunk => output.push(String(chunk)));
  server.stderr.on("data", chunk => output.push(String(chunk)));
  const serverOutput = () => output.join("");

  t.after(async () => {
    if (server.exitCode === null && !server.killed) {
      const exited = new Promise(resolve => server.once("exit", resolve));
      server.kill("SIGTERM");
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) break;
    try {
      const health = await fetch(`${baseUrl}/api/health`);
      if (health.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, `API did not start. Server output: ${serverOutput()}`);

  const noAuth = await request("/patients");
  assert.equal(noAuth.status, 401);
  const missingLogin = await request("/auth/login", { method: "POST", body: { email: "", password: "" } });
  assert.equal(missingLogin.status, 400);
  const invalidLogin = await request("/auth/login", { method: "POST", body: { email: "admin@example.com", password: "wrong-password" } });
  assert.equal(invalidLogin.status, 401);
  const badToken = await request("/reports/summary", { token: "not-a-valid-token" });
  assert.equal(badToken.status, 401);

  const admin = await login("admin@example.com", "AdminDemo123!");
  const receptionist = await login("reception@example.com", "ReceptionDemo123!");
  const doctorUser = await login("doctor@example.com", "DoctorDemo123!");
  const report = await request("/reports/summary", { token: admin.token });
  assert.equal(report.status, 200);
  assert.equal((await request("/reports/summary", { token: receptionist.token })).status, 403);
  assert.equal((await request("/departments", { token: receptionist.token, method: "POST", body: { name: "Not Allowed" } })).status, 403);
  assert.equal((await request("/billing", { token: doctorUser.token })).status, 403);

  const suffix = `${Date.now()}`;
  const patientPayload = {
    fullName: `Integration Patient ${suffix}`,
    phone: "+91 98765 43210",
    email: `integration-${suffix}@example.com`,
    address: "Integration test address"
  };
  const patientCreated = await request("/patients", { token: receptionist.token, method: "POST", body: patientPayload });
  assert.equal(patientCreated.status, 201, JSON.stringify(patientCreated.data));
  const patientId = patientCreated.data._id;
  assert.ok(patientId);
  const patientSearch = await request(`/patients?q=${encodeURIComponent(patientPayload.fullName)}`, { token: receptionist.token });
  assert.equal(patientSearch.status, 200);
  assert.ok(patientSearch.data.some(patient => patient._id === patientId), "patient should persist and be searchable");
  const invalidPatient = await request("/patients", {
    token: receptionist.token, method: "POST",
    body: { fullName: "Invalid phone case", phone: "abc123" }
  });
  assert.equal(invalidPatient.status, 400);

  const departmentName = `Integration Department ${suffix}`;
  const department = await request("/departments", {
    token: admin.token, method: "POST", body: { name: departmentName, description: "Created in integration test" }
  });
  assert.equal(department.status, 201, JSON.stringify(department.data));
  const invalidDoctor = await request("/doctors", {
    token: receptionist.token, method: "POST",
    body: { fullName: "Invalid Integration Doctor", specialization: "General", department: "Does Not Exist", availability: [] }
  });
  assert.equal(invalidDoctor.status, 400);
  const availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "17:00" }));
  const doctor = await request("/doctors", {
    token: receptionist.token, method: "POST",
    body: { fullName: `Dr Integration ${suffix}`, specialization: "General Medicine", department: departmentName, availability }
  });
  assert.equal(doctor.status, 201, JSON.stringify(doctor.data));
  const doctorId = doctor.data._id;

  const renamedDepartmentName = `${departmentName} Renamed`;
  const renamedDepartment = await request(`/departments/${department.data._id}`, {
    token: admin.token, method: "PATCH", body: { name: renamedDepartmentName }
  });
  assert.equal(renamedDepartment.status, 200, JSON.stringify(renamedDepartment.data));
  const doctorAfterRename = await request(`/doctors?q=${encodeURIComponent(`Dr Integration ${suffix}`)}`, { token: admin.token });
  assert.equal(doctorAfterRename.status, 200);
  assert.equal(doctorAfterRename.data[0]?.department, renamedDepartmentName);
  const departmentWithActiveDoctor = await request(`/departments/${department.data._id}`, {
    token: admin.token, method: "DELETE"
  });
  assert.equal(departmentWithActiveDoctor.status, 409);

  const slot1 = indiaDate(7, 10, 30);
  const slot2 = indiaDate(8, 11, 30);
  const slot3 = indiaDate(9, 12, 30);
  const bookingBody = { patient: patientId, doctor: doctorId, scheduledAt: slot1, reason: "Integration test" };
  const booked = await request("/appointments", { token: receptionist.token, method: "POST", body: bookingBody });
  assert.equal(booked.status, 201, JSON.stringify(booked.data));
  const conflict = await request("/appointments", { token: receptionist.token, method: "POST", body: bookingBody });
  assert.equal(conflict.status, 409);
  const cancelled = await request(`/appointments/${booked.data._id}/cancel`, { token: receptionist.token, method: "PATCH" });
  assert.equal(cancelled.status, 200);
  const rebooked = await request("/appointments", { token: receptionist.token, method: "POST", body: bookingBody });
  assert.equal(rebooked.status, 201, "cancellation should release the time slot");

  const blocker = await request("/appointments", {
    token: receptionist.token, method: "POST",
    body: { ...bookingBody, scheduledAt: slot2, reason: "Conflict blocker" }
  });
  assert.equal(blocker.status, 201);
  const blockedReschedule = await request(`/appointments/${rebooked.data._id}/reschedule`, {
    token: receptionist.token, method: "PATCH", body: { scheduledAt: slot2 }
  });
  assert.equal(blockedReschedule.status, 409);
  assert.equal((await request(`/appointments/${blocker.data._id}/cancel`, { token: receptionist.token, method: "PATCH" })).status, 200);
  const rescheduled = await request(`/appointments/${rebooked.data._id}/reschedule`, {
    token: receptionist.token, method: "PATCH", body: { scheduledAt: slot2 }
  });
  assert.equal(rescheduled.status, 200, JSON.stringify(rescheduled.data));
  const completed = await request(`/appointments/${rebooked.data._id}/complete`, {
    token: doctorUser.token, method: "PATCH"
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, "Completed");

  const admissionBody = { patient: patientId, roomNumber: `R-${suffix}`, bedNumber: "B-1" };
  const admission = await request("/admissions", { token: receptionist.token, method: "POST", body: admissionBody });
  assert.equal(admission.status, 201, JSON.stringify(admission.data));
  const occupiedBed = await request("/admissions", { token: receptionist.token, method: "POST", body: admissionBody });
  assert.equal(occupiedBed.status, 409);
  const discharge = await request(`/admissions/${admission.data._id}/discharge`, { token: receptionist.token, method: "PATCH" });
  assert.equal(discharge.status, 200);
  const reusedBed = await request("/admissions", { token: receptionist.token, method: "POST", body: admissionBody });
  assert.equal(reusedBed.status, 201, "discharge should release a bed");

  const history = await request(`/patients/${patientId}/history`, {
    token: doctorUser.token, method: "POST",
    body: { diagnosis: "Integration diagnosis", treatment: "Integration treatment", note: "Test record" }
  });
  assert.equal(history.status, 200);
  const prescription = await request(`/patients/${patientId}/prescriptions`, {
    token: doctorUser.token, method: "POST",
    body: { medicine: "Integration medicine", instructions: "Take only as directed" }
  });
  assert.equal(prescription.status, 200);
  const reloadedPatient = await request(`/patients/${patientId}`, { token: receptionist.token });
  assert.equal(reloadedPatient.status, 200);
  assert.equal(reloadedPatient.data.medicalHistory.at(-1).diagnosis, "Integration diagnosis");
  assert.equal(reloadedPatient.data.prescriptions.at(-1).medicine, "Integration medicine");

  const bill = await request("/billing", {
    token: receptionist.token, method: "POST",
    body: { patient: patientId, items: [
      { description: "Consultation", quantity: 2, unitPrice: 150 },
      { description: "Lab test", quantity: 1, unitPrice: 50 }
    ], notes: "Integration billing" }
  });
  assert.equal(bill.status, 201, JSON.stringify(bill.data));
  assert.equal(bill.data.subtotal, 350);
  const paidBill = await request(`/billing/${bill.data._id}/pay`, { token: receptionist.token, method: "PATCH" });
  assert.equal(paidBill.status, 200);
  assert.equal(paidBill.data.status, "Paid");
  assert.equal((await request(`/billing/${bill.data._id}/pay`, { token: receptionist.token, method: "PATCH" })).status, 409);
  assert.equal((await request(`/billing/${bill.data._id}/cancel`, { token: receptionist.token, method: "PATCH" })).status, 409);
  const unpaidBill = await request("/billing", {
    token: receptionist.token, method: "POST",
    body: { patient: patientId, items: [{ description: "Follow-up", quantity: 1, unitPrice: 75 }] }
  });
  assert.equal(unpaidBill.status, 201);
  const reminders = await request("/notifications", { token: receptionist.token });
  assert.equal(reminders.status, 200);
  assert.ok(reminders.data.some(item => item.type === "Payment reminder" && item.recordId === unpaidBill.data._id));
  const refreshedReport = await request("/reports/summary", { token: admin.token });
  assert.equal(refreshedReport.status, 200);
  assert.ok(refreshedReport.data.paidRevenue >= 350);

  const registration = await request("/auth/register", {
    method: "POST",
    body: { name: `Self Service Patient ${suffix}`, email: `self-${suffix}@example.com`, password: "PatientDemo123!" }
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.data));
  const duplicateRegistration = await request("/auth/register", {
    method: "POST",
    body: { name: "Duplicate", email: `self-${suffix}@example.com`, password: "PatientDemo123!" }
  });
  assert.equal(duplicateRegistration.status, 409);
  const patientUser = await login(`self-${suffix}@example.com`, "PatientDemo123!");
  const ownPatients = await request("/patients", { token: patientUser.token });
  assert.equal(ownPatients.status, 200);
  assert.equal(ownPatients.data.length, 1);
  const ownProfileId = ownPatients.data[0]._id;
  assert.equal(ownPatients.data[0].linkedUser, registration.data.id);
  assert.equal((await request(`/patients/${patientId}`, { token: patientUser.token })).status, 403);
  const patientCannotBookOtherProfile = await request("/appointments", {
    token: patientUser.token, method: "POST",
    body: { patient: patientId, doctor: doctorId, scheduledAt: slot3 }
  });
  assert.equal(patientCannotBookOtherProfile.status, 403);
  const selfBooking = await request("/appointments", {
    token: patientUser.token, method: "POST",
    body: { patient: ownProfileId, doctor: doctorId, scheduledAt: slot3, reason: "Self-service booking" }
  });
  assert.equal(selfBooking.status, 201, JSON.stringify(selfBooking.data));
  const ownAppointments = await request("/appointments", { token: patientUser.token });
  assert.ok(ownAppointments.data.every(appointment => String(appointment.patient?._id || appointment.patient) === ownProfileId));

  const deactivatedDoctor = await request(`/doctors/${doctorId}`, { token: admin.token, method: "DELETE" });
  assert.equal(deactivatedDoctor.status, 200);
  const deactivatedDepartment = await request(`/departments/${department.data._id}`, { token: admin.token, method: "DELETE" });
  assert.equal(deactivatedDepartment.status, 200);
  const activeDoctorSearch = await request(`/doctors?q=${encodeURIComponent(`Dr Integration ${suffix}`)}`, { token: admin.token });
  assert.equal(activeDoctorSearch.status, 200);
  assert.equal(activeDoctorSearch.data.length, 0);
  const activeDepartments = await request("/departments", { token: admin.token });
  assert.equal(activeDepartments.status, 200);
  assert.ok(!activeDepartments.data.some(item => item._id === department.data._id));

  console.log("Integration workflow completed: auth, role controls, patient persistence, doctor/department CRUD, appointments, admissions, clinical records, billing, reminders, and reports.");
});
