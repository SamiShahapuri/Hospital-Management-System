import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Patient from "../src/models/Patient.js";
import Doctor from "../src/models/Doctor.js";
import Appointment from "../src/models/Appointment.js";
import AppointmentReminder from "../src/models/AppointmentReminder.js";
import { generateAppointmentReminders, syncAppointmentReminder } from "../src/services/appointmentReminders.js";

const enabled = process.env.HMS_INTEGRATION_TESTS === "1" && Boolean(process.env.MONGODB_URI);

test("UT_M7_01: scheduled appointment reminders are persisted once and reconciled after changes", {
  skip: !enabled ? "Set HMS_INTEGRATION_TESTS=1 and MONGODB_URI to run reminder integration tests." : false,
  timeout: 30_000
}, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let patient;
  let doctor;
  let appointment;
  try {
    patient = await Patient.create({
      fullName: `UT_M7_01 Patient ${suffix}`,
      email: `ut-m7-01-${suffix}@example.test`,
      phone: `+91 90${String(Date.now()).slice(-8)}`,
      patientId: `PT-M7${String(Date.now()).slice(-6)}`
    });
    doctor = await Doctor.create({
      fullName: `UT_M7_01 Doctor ${suffix}`,
      specialization: "General Medicine",
      department: "General Medicine",
      email: `doctor-m7-01-${suffix}@example.test`,
      availability: []
    });

    const firstScheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      scheduledAt: firstScheduledAt,
      durationMinutes: 30,
      status: "Booked",
      reason: "UT_M7_01 scheduled reminder verification"
    });

    const firstRun = await generateAppointmentReminders();
    assert.ok(firstRun.created >= 1, "the scheduled job should create a reminder inside the next 24 hours");
    const originalKey = `${appointment._id}:${firstScheduledAt.getTime()}`;
    const firstReminder = await AppointmentReminder.findOne({ eventKey: originalKey });
    assert.ok(firstReminder, "the reminder should be persisted");
    assert.equal(firstReminder.status, "Pending");

    await generateAppointmentReminders();
    assert.equal(await AppointmentReminder.countDocuments({ eventKey: originalKey }), 1,
      "re-running the job must not create a duplicate reminder");

    const nextScheduledAt = new Date(Date.now() + 18 * 60 * 60 * 1000);
    appointment.scheduledAt = nextScheduledAt;
    await appointment.save();
    await syncAppointmentReminder(await Appointment.findById(appointment._id).populate("patient", "fullName").populate("doctor", "fullName"));

    const originalAfterReschedule = await AppointmentReminder.findOne({ eventKey: originalKey });
    assert.equal(originalAfterReschedule.status, "Superseded",
      "the previous reminder must no longer be pending after rescheduling");
    const nextKey = `${appointment._id}:${nextScheduledAt.getTime()}`;
    const nextReminder = await AppointmentReminder.findOne({ eventKey: nextKey });
    assert.ok(nextReminder, "rescheduling inside the reminder window should create a reminder for the new time");
    assert.equal(nextReminder.status, "Pending");

    appointment.status = "Cancelled";
    await appointment.save();
    await syncAppointmentReminder(await Appointment.findById(appointment._id).populate("patient", "fullName").populate("doctor", "fullName"));
    const cancelledReminder = await AppointmentReminder.findOne({ eventKey: nextKey });
    assert.equal(cancelledReminder.status, "Cancelled",
      "cancelling the appointment must cancel its pending reminder");

    const cancelledAppointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      durationMinutes: 30,
      status: "Cancelled",
      reason: "Cancelled appointment must not remind"
    });
    await generateAppointmentReminders();
    assert.equal(await AppointmentReminder.countDocuments({ appointment: cancelledAppointment._id }), 0,
      "cancelled appointments must never generate reminders");
    await Appointment.deleteOne({ _id: cancelledAppointment._id });
  } finally {
    if (appointment) await Appointment.deleteOne({ _id: appointment._id });
    if (patient) await Patient.deleteOne({ _id: patient._id });
    if (doctor) await Doctor.deleteOne({ _id: doctor._id });
    await AppointmentReminder.deleteMany({ eventKey: { $regex: String(appointment?._id || "no-appointment") } });
    await mongoose.disconnect();
  }
});
