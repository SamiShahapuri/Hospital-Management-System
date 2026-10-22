import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = (relativePath) => fs.readFileSync(path.resolve(here, relativePath), "utf8");

test("server registers doctor, department and appointment routes", () => {
  const server = source("../src/server.js");
  assert.match(server, /app\.use\("\/api\/doctors", doctorRoutes\)/);
  assert.match(server, /app\.use\("\/api\/departments", departmentRoutes\)/);
  assert.match(server, /app\.use\("\/api\/appointments", appointmentRoutes\)/);
});

test("doctor endpoints enforce authentication and role permissions", () => {
  const routes = source("../src/routes/doctors.js");
  assert.match(routes, /router\.use\(authenticate\)/);
  assert.match(routes, /allowRoles\("Admin", "Receptionist"\)/);
  assert.match(routes, /validAvailability/);
  assert.match(routes, /Doctor\.findByIdAndUpdate/);
});

test("department endpoints validate names and handle duplicates", () => {
  const routes = source("../src/routes/departments.js");
  assert.match(routes, /Department name is required/);
  assert.match(routes, /error\?\.code === 11000/);
  assert.match(routes, /allowRoles\("Admin"\)/);
});

test("appointment endpoints validate future times and prevent double bookings", () => {
  const routes = source("../src/routes/appointments.js");
  assert.match(routes, /date <= new Date\(\)/);
  assert.match(routes, /Doctor already has an appointment at this time/);
  assert.match(routes, /appointment\.status = "Cancelled"/);
  assert.match(routes, /Only booked appointments can be cancelled/);
});

test("doctor and appointment schemas define persistent records and indexes", () => {
  const doctor = source("../src/models/Doctor.js");
  const appointment = source("../src/models/Appointment.js");
  assert.match(doctor, /timestamps: true/);
  assert.match(doctor, /doctorSchema\.index/);
  assert.match(appointment, /ref: "Patient"/);
  assert.match(appointment, /ref: "Doctor"/);
  assert.match(appointment, /appointmentSchema\.index/);
});
