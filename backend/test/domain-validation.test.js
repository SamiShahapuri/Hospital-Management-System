import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { isValidPassword } from "../src/utils/validation.js";
import { allowRoles } from "../src/middleware/auth.js";
import { validAvailability } from "../src/routes/doctors.js";
import { createSlotKeys, doctorAcceptsTime } from "../src/routes/appointments.js";
import Patient from "../src/models/Patient.js";
import Doctor from "../src/models/Doctor.js";
import Department from "../src/models/Department.js";
import Appointment from "../src/models/Appointment.js";
import Admission from "../src/models/Admission.js";
import Bed from "../src/models/Bed.js";
import Bill from "../src/models/Bill.js";

const objectId = () => new mongoose.Types.ObjectId();

test("password validation enforces the 8 to 128 character boundary", () => {
  assert.equal(isValidPassword("1234567"), false);
  assert.equal(isValidPassword("12345678"), true);
  assert.equal(isValidPassword("x".repeat(128)), true);
  assert.equal(isValidPassword("x".repeat(129)), false);
  assert.equal(isValidPassword(null), false);
});

test("authorization middleware permits listed roles and rejects missing or disallowed roles", () => {
  const middleware = allowRoles("Admin", "Receptionist");
  let nextCalled = false;
  middleware({ user: { role: "Admin" } }, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  for (const user of [undefined, { role: "Patient" }]) {
    let statusCode;
    let payload;
    middleware({ user }, {
      status(code) { statusCode = code; return this; },
      json(body) { payload = body; return this; }
    }, () => assert.fail("unauthorized role reached next"));
    assert.equal(statusCode, 403);
    assert.match(payload.message, /permission/i);
  }
});

test("patient model validates required identity, age, gender, and clinical records", () => {
  assert.ok(new Patient({ age: 34 }).validateSync()?.errors.fullName);
  assert.ok(new Patient({ fullName: "Ravi", age: -1 }).validateSync()?.errors.age);
  assert.ok(new Patient({ fullName: "Ravi", age: 121 }).validateSync()?.errors.age);
  assert.ok(new Patient({ fullName: "Ravi", gender: "Unknown" }).validateSync()?.errors.gender);
  assert.equal(new Patient({
    fullName: "Ravi Kumar", age: 34, gender: "Male",
    medicalHistory: [{ diagnosis: "Hypertension", treatment: "Medication" }],
    prescriptions: [{ medicine: "Paracetamol", dosage: "500 mg" }]
  }).validateSync(), undefined);
  assert.ok(new Patient({ fullName: "Ravi", prescriptions: [{ dosage: "500 mg" }] }).validateSync());
});

test("doctor and department models enforce required fields, supported values, and boundaries", () => {
  assert.ok(new Doctor({ fullName: "Dr Test" }).validateSync()?.errors.specialization);
  assert.ok(new Doctor({ fullName: "Dr Test", specialization: "Medicine", consultationDuration: 10 }).validateSync()?.errors.consultationDuration);
  assert.ok(new Department({ name: "X", icon: "invalid" }).validateSync()?.errors.icon);
  assert.ok(new Department({ name: "x".repeat(101) }).validateSync()?.errors.name);
  assert.equal(new Department({ name: "Cardiology", icon: "heart" }).validateSync(), undefined);
});

test("doctor availability rejects malformed, reversed, and out-of-range schedules", () => {
  assert.equal(validAvailability(undefined), true);
  assert.equal(validAvailability([{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]), true);
  assert.equal(validAvailability([{ dayOfWeek: 7, startTime: "09:00", endTime: "17:00" }]), false);
  assert.equal(validAvailability([{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }]), false);
  assert.equal(validAvailability([{ dayOfWeek: 1, startTime: "9:00", endTime: "17:00" }]), false);
});

test("appointment slot helpers enforce the full consultation window and minute uniqueness", () => {
  const doctor = { availability: [{ dayOfWeek: 2, startTime: "09:00", endTime: "11:00" }] };
  const tenAmTuesdayIndia = new Date("2026-11-17T04:30:00.000Z");
  const tenThirtyTuesdayIndia = new Date("2026-11-17T05:00:00.000Z");
  assert.equal(doctorAcceptsTime(doctor, tenAmTuesdayIndia, 60), true);
  assert.equal(doctorAcceptsTime(doctor, tenThirtyTuesdayIndia, 60), false);
  const keys = createSlotKeys(tenAmTuesdayIndia, 30);
  assert.equal(keys.length, 30);
  assert.equal(new Set(keys).size, 30);
  assert.ok(new Appointment({ patient: objectId(), doctor: objectId(), scheduledAt: tenAmTuesdayIndia, durationMinutes: 4 }).validateSync()?.errors.durationMinutes);
});

test("admission and bed models enforce allocation and status rules", () => {
  const patient = objectId();
  const admittedBy = objectId();
  const missingLocation = new Admission({ patient, admittedBy });
  const error = missingLocation.validateSync();
  assert.ok(error?.errors.roomNumber);
  assert.ok(error?.errors.bedNumber);
  assert.equal(new Admission({ patient, admittedBy, bed: objectId() }).validateSync(), undefined);
  assert.ok(new Admission({ patient, admittedBy, bed: objectId(), treatments: [{ details: "No description" }] }).validateSync());
  assert.ok(new Bed({ room: objectId(), bedNumber: "A-1", status: "Broken" }).validateSync()?.errors.status);
});

test("billing model validates item quantities, payment amounts, and payment modes", () => {
  const base = { patient: objectId(), createdBy: objectId(), subtotal: 500, balanceDue: 500 };
  assert.ok(new Bill({ ...base, items: [] }).validateSync()?.errors.items);
  assert.ok(new Bill({ ...base, items: [{ description: "Consultation", quantity: 0, unitPrice: 500, lineTotal: 0 }] }).validateSync());
  assert.ok(new Bill({ ...base, items: [{ description: "Consultation", quantity: 1, unitPrice: 500, lineTotal: 500 }], paymentHistory: [{ amount: 0, mode: "Cash" }] }).validateSync());
  assert.ok(new Bill({ ...base, items: [{ description: "Consultation", quantity: 1, unitPrice: 500, lineTotal: 500 }], paymentHistory: [{ amount: 100, mode: "Cheque" }] }).validateSync());
  assert.equal(new Bill({ ...base, items: [{ description: "Consultation", quantity: 1, unitPrice: 500, lineTotal: 500 }], paymentHistory: [{ amount: 100, mode: "UPI" }] }).validateSync(), undefined);
});
