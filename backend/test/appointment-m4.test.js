import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Patient from "../src/models/Patient.js";
import Doctor from "../src/models/Doctor.js";
import Appointment from "../src/models/Appointment.js";
import AppointmentReminder from "../src/models/AppointmentReminder.js";

const enabled = process.env.HMS_M4_INTEGRATION_TESTS === "1";
const uri = process.env.MONGODB_URI || "";
const databaseName = (() => {
  try { return new URL(uri).pathname.slice(1); } catch { return ""; }
})();
const requiredDatabaseName = process.env.HMS_M4_TEST_DATABASE_NAME || "hospital_management_m4_test";
const port = Number(process.env.HMS_M4_TEST_PORT || 5113);
const baseUrl = `http://127.0.0.1:${port}/api`;
const jwtSecret = process.env.JWT_SECRET || "m4-test-only-secret";
let server;
let serverOutput = "";

async function request(route, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

function futureIndiaDate(daysAhead, hour, minute = 0) {
  const target = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(target);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(`${values.year}-${values.month}-${values.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`).toISOString();
}

async function createFixture(id) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await User.create({
    name: `M4 ${id} operator ${suffix}`,
    email: `m4-${id.toLowerCase()}-${suffix}@example.test`,
    passwordHash: await bcrypt.hash("M4-test-password", 4),
    role: "Receptionist"
  });
  const patient = await Patient.create({
    fullName: `M4 ${id} patient ${suffix}`,
    email: `patient-${suffix}@example.test`,
    phone: `+91 9${String(Date.now()).slice(-9)}`,
    patientId: `PTM4${String(Date.now()).slice(-7)}`
  });
  const doctor = await Doctor.create({
    fullName: `M4 ${id} doctor ${suffix}`,
    specialization: "General Medicine",
    department: "General Medicine",
    email: `doctor-${suffix}@example.test`,
    availability: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "17:00" }))
  });
  const token = jwt.sign({ id: String(user._id), role: user.role, tokenVersion: 0 }, jwtSecret, { expiresIn: "5m" });
  return { user, patient, doctor, token };
}

async function cleanupFixture(fixture) {
  if (!fixture) return;
  const appointmentIds = await Appointment.find({ patient: fixture.patient._id, doctor: fixture.doctor._id }).distinct("_id");
  if (appointmentIds.length) {
    const regex = new RegExp(`^(${appointmentIds.map(String).join("|")}):`);
    await AppointmentReminder.deleteMany({ $or: [{ appointment: { $in: appointmentIds } }, { eventKey: regex }] });
  }
  await Appointment.deleteMany({ patient: fixture.patient._id, doctor: fixture.doctor._id });
  await Patient.deleteOne({ _id: fixture.patient._id });
  await Doctor.deleteOne({ _id: fixture.doctor._id });
  await User.deleteOne({ _id: fixture.user._id });
}

before(async () => {
  if (!enabled) return;
  assert.ok(uri, "MONGODB_URI must point to a dedicated M4 test database");
  assert.equal(databaseName, requiredDatabaseName,
    `Refusing to run M4 integration tests against ${databaseName || "an unparseable URI"}; expected dedicated database ${requiredDatabaseName}`);
  assert.notEqual(databaseName, "hospital_management_sprint1", "Development database is forbidden for M4 tests");
  await mongoose.connect(uri);
  server = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, MONGODB_URI: uri, JWT_SECRET: jwtSecret, PORT: String(port), HOSPITAL_TIME_ZONE: "Asia/Kolkata" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", chunk => { serverOutput += String(chunk); });
  server.stderr.on("data", chunk => { serverOutput += String(chunk); });
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.equal(ready, true, `API did not start. ${serverOutput}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

test("UT_M4_03 — Reschedule an existing appointment", {
  skip: !enabled ? "Set HMS_M4_INTEGRATION_TESTS=1 and MONGODB_URI to the dedicated M4 database." : false,
  timeout: 45_000
}, async () => {
  let fixture;
  try {
    fixture = await createFixture("UT_M4_03");
    const originalTime = futureIndiaDate(7, 10);
    const newTime = futureIndiaDate(10, 11);
    const booking = await request("/appointments", {
      token: fixture.token, method: "POST",
      body: { patient: String(fixture.patient._id), doctor: String(fixture.doctor._id), scheduledAt: originalTime, reason: "UT_M4_03 reschedule" }
    });
    assert.equal(booking.status, 201, JSON.stringify(booking.data));
    const result = await request(`/appointments/${booking.data._id}/reschedule`, {
      token: fixture.token, method: "PATCH", body: { scheduledAt: newTime }
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(new Date(result.data.scheduledAt).toISOString(), newTime);
    const stored = await Appointment.findById(booking.data._id).lean();
    assert.equal(new Date(stored.scheduledAt).toISOString(), newTime, "new future slot must persist in MongoDB");
    assert.equal(stored.status, "Booked");
  } finally { await cleanupFixture(fixture); }
});

test("UT_M4_04 — Cancel an existing appointment", {
  skip: !enabled ? "Set HMS_M4_INTEGRATION_TESTS=1 and MONGODB_URI to the dedicated M4 database." : false,
  timeout: 45_000
}, async () => {
  let fixture;
  try {
    fixture = await createFixture("UT_M4_04");
    const scheduledAt = futureIndiaDate(8, 10);
    const booking = await request("/appointments", {
      token: fixture.token, method: "POST",
      body: { patient: String(fixture.patient._id), doctor: String(fixture.doctor._id), scheduledAt, reason: "UT_M4_04 cancellation" }
    });
    assert.equal(booking.status, 201, JSON.stringify(booking.data));
    const result = await request(`/appointments/${booking.data._id}/cancel`, { token: fixture.token, method: "PATCH" });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.status, "Cancelled");
    const stored = await Appointment.findById(booking.data._id).lean();
    assert.ok(stored, "cancelled appointment remains stored");
    assert.equal(stored.status, "Cancelled", "cancellation status must persist in MongoDB");
  } finally { await cleanupFixture(fixture); }
});

test("UT_M4_05 — Reject an appointment with a past date", {
  skip: !enabled ? "Set HMS_M4_INTEGRATION_TESTS=1 and MONGODB_URI to the dedicated M4 database." : false,
  timeout: 45_000
}, async () => {
  let fixture;
  try {
    fixture = await createFixture("UT_M4_05");
    const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await request("/appointments", {
      token: fixture.token, method: "POST",
      body: { patient: String(fixture.patient._id), doctor: String(fixture.doctor._id), scheduledAt: pastTime, reason: "UT_M4_05 past date" }
    });
    assert.equal(result.status, 400, JSON.stringify(result.data));
    assert.match(result.data.message, /future date and time/i);
    assert.equal(await Appointment.countDocuments({ patient: fixture.patient._id, doctor: fixture.doctor._id }), 0,
      "past appointment must not be persisted");
  } finally { await cleanupFixture(fixture); }
});
