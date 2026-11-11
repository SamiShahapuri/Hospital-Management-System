import { Router } from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { parseFutureDate } from "../utils/validation.js";
import { syncAppointmentReminder } from "../services/appointmentReminders.js";

const router = Router();
router.use(authenticate);

const isValidId = (value) => mongoose.isValidObjectId(value);
const hospitalTimeZone = process.env.HOSPITAL_TIME_ZONE || "Asia/Kolkata";

function getHospitalScheduleParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: hospitalTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayOfWeek: weekdays[values.weekday],
    appointmentTime: `${values.hour}:${values.minute}`,
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

export function createSlotKeys(start, durationMinutes) {
  const keys = [];
  for (let offset = 0; offset < durationMinutes; offset += 1) {
    const point = new Date(start.getTime() + offset * 60000);
    keys.push([point.getUTCFullYear(), String(point.getUTCMonth()+1).padStart(2,"0"), String(point.getUTCDate()).padStart(2,"0"), String(point.getUTCHours()).padStart(2,"0"), String(point.getUTCMinutes()).padStart(2,"0")].join(""));
  }
  return keys;
}

export function doctorAcceptsTime(doctor, date, duration) {
  const { dayOfWeek, hour, minute } = getHospitalScheduleParts(date);
  const start = hour * 60 + minute;
  const end = start + duration;
  return (doctor.availability || []).some((slot) => {
    const open = Number(slot.startTime.slice(0,2))*60 + Number(slot.startTime.slice(3));
    const close = Number(slot.endTime.slice(0,2))*60 + Number(slot.endTime.slice(3));
    return slot.dayOfWeek === dayOfWeek && start >= open && end <= close;
  });
}

async function hasOverlap(doctorId, date, duration, excludeId) {
  const end = new Date(date.getTime() + duration * 60000);
  const filter = { doctor: doctorId, status: { $in: ["Booked", "Confirmed"] }, scheduledAt: { $lt: end, $gte: new Date(date.getTime() - 180 * 60000) } };
  if (excludeId) filter._id = { $ne: excludeId };
  const nearby = await Appointment.find(filter).select("scheduledAt durationMinutes");
  return nearby.some((item) => {
    const existingStart = new Date(item.scheduledAt).getTime();
    const existingEnd = existingStart + (item.durationMinutes || 30) * 60000;
    return date.getTime() < existingEnd && existingStart < end.getTime();
  });
}

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      const status = String(req.query.status);
      if (!["Booked", "Confirmed", "Cancelled", "Completed", "No-show"].includes(status)) {
        return res.status(400).json({ message: "Invalid appointment status" });
      }
      filter.status = status;
    }
    if (req.query.doctor) {
      if (!isValidId(req.query.doctor)) return res.status(400).json({ message: "Invalid doctor ID" });
      filter.doctor = req.query.doctor;
    }
    if (req.query.patient) {
      if (!isValidId(req.query.patient)) return res.status(400).json({ message: "Invalid patient ID" });
      filter.patient = req.query.patient;
    }
    if (req.user.role === "Doctor") {
      const doctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!doctor) return res.json([]);
      if (req.query.doctor && String(doctor._id) !== String(req.query.doctor)) {
        return res.status(403).json({ message: "You can only view your own appointments" });
      }
      filter.doctor = doctor._id;
    }
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile) return res.json([]);
      if (req.query.patient && String(ownProfile._id) !== String(req.query.patient)) {
        return res.status(403).json({ message: "You can only view your own appointments" });
      }
      filter.patient = ownProfile._id;
    }
    const appointments = await Appointment.find(filter)
      .populate("patient", "fullName phone")
      .populate("doctor", "fullName specialization department")
      .sort({ scheduledAt: 1 }).limit(100);
    res.json(appointments);
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const { patient, doctor, scheduledAt, reason = "" } = req.body;
    if (!isValidId(patient) || !isValidId(doctor)) {
      return res.status(400).json({ message: "Valid patient and doctor IDs are required" });
    }
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile || String(ownProfile._id) !== String(patient)) {
        return res.status(403).json({ message: "You can only book appointments for your own patient profile" });
      }
    }
    const date = parseFutureDate(scheduledAt);
    if (!date) {
      return res.status(400).json({ message: "Appointment time must be a valid future date and time" });
    }
    if (typeof reason !== "string" || reason.length > 500) {
      return res.status(400).json({ message: "Reason must be text up to 500 characters" });
    }
    
    const [patientExists, doctorRecord] = await Promise.all([
      Patient.exists({ _id: patient }),
      Doctor.findOne({ _id: doctor, active: true })
    ]);

    if (!patientExists) {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (!doctorRecord) {
      return res.status(404).json({ message: "Active doctor not found" });
    }

    const durationMinutes = doctorRecord.consultationDuration || 30;
    if (!doctorAcceptsTime(doctorRecord, date, durationMinutes)) {
      return res.status(400).json({ message: "Doctor is not available for the full consultation duration at the requested time" });
    }
    if (await hasOverlap(doctor, date, durationMinutes)) {
      return res.status(409).json({ message: "This slot overlaps another appointment. Choose a different time." });
    }
    const appointment = await Appointment.create({
      patient, doctor, scheduledAt: date, durationMinutes, slotKeys: createSlotKeys(date, durationMinutes), reason: reason.trim(), createdBy: req.user.id
    });
    await appointment.populate([
      { path: "patient", select: "fullName phone" },
      { path: "doctor", select: "fullName specialization department" }
    ]);
    await syncAppointmentReminder(appointment);
    res.status(201).json(appointment);
  } catch (error) {
    // The unique partial index is the race-safe guard; translate its conflict to HTTP 409.
    if (error.code === 11000) {
      return res.status(409).json({ message: "Doctor already has an appointment at this time" });
    }
    next(error);
  }
});

router.patch("/:id/reschedule", allowRoles("Admin", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (!["Booked", "Confirmed"].includes(appointment.status)) {
      return res.status(409).json({ message: "Only booked appointments can be rescheduled" });
    }
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile || String(appointment.patient) !== String(ownProfile._id)) {
        return res.status(403).json({ message: "You can only reschedule your own appointments" });
      }
    }

    const date = parseFutureDate(req.body.scheduledAt);
    if (!date) {
      return res.status(400).json({ message: "Appointment time must be a valid future date and time" });
    }
    const doctorId = req.body.doctor || String(appointment.doctor);
    if (!isValidId(doctorId)) return res.status(400).json({ message: "Valid doctor ID is required" });
    const doctorRecord = await Doctor.findOne({ _id: doctorId, active: true });
    if (!doctorRecord) return res.status(404).json({ message: "Active doctor not found" });

    const durationMinutes = doctorRecord.consultationDuration || appointment.durationMinutes || 30;
    if (!doctorAcceptsTime(doctorRecord, date, durationMinutes)) {
      return res.status(400).json({ message: "Doctor is not available for the full consultation duration at the requested time" });
    }
    if (await hasOverlap(doctorId, date, durationMinutes, appointment._id)) {
      return res.status(409).json({ message: "This slot overlaps another appointment. Choose a different time." });
    }

    const updated = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: { $in: ["Booked", "Confirmed"] } },
      { $set: { doctor: doctorId, scheduledAt: date, durationMinutes, slotKeys: createSlotKeys(date, durationMinutes) } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone").populate("doctor", "fullName specialization department");
    if (!updated) return res.status(409).json({ message: "Appointment changed before it could be rescheduled" });
    await syncAppointmentReminder(updated);
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Doctor already has an appointment at this time" });
    }
    next(error);
  }
});

router.patch("/:id/cancel", allowRoles("Admin", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile || String(appointment.patient) !== String(ownProfile._id)) {
        return res.status(403).json({ message: "You can only cancel your own appointments" });
      }
    }
    if (!["Booked", "Confirmed"].includes(appointment.status)) {
      return res.status(409).json({ message: "Only booked appointments can be cancelled" });
    }
    appointment.status = "Cancelled";
    await appointment.save();
    await appointment.populate([
      { path: "patient", select: "fullName phone" },
      { path: "doctor", select: "fullName specialization department" }
    ]);
    await syncAppointmentReminder(appointment);
    res.json(appointment);
  } catch (error) { next(error); }
});

router.patch("/:id/complete", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const filter = { _id: req.params.id, status: { $in: ["Booked", "Confirmed"] } };
    if (req.user.role === "Doctor") {
      const ownDoctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!ownDoctor) return res.status(403).json({ message: "Your doctor profile is not linked." });
      filter.doctor = ownDoctor._id;
    }
    const appointment = await Appointment.findOneAndUpdate(
      filter,
      { status: "Completed" },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone").populate("doctor", "fullName specialization department");
    if (!appointment) return res.status(404).json({ message: "Booked appointment not found" });
    await syncAppointmentReminder(appointment);
    res.json(appointment);
  } catch (error) { next(error); }
});


router.patch("/:id/confirm", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const appointment = await Appointment.findOneAndUpdate({ _id: req.params.id, status: "Booked" }, { $set: { status: "Confirmed" } }, { new: true }).populate("patient", "fullName phone").populate("doctor", "fullName specialization department");
    if (!appointment) return res.status(409).json({ message: "Only scheduled appointments can be confirmed" });
    await syncAppointmentReminder(appointment);
    res.json(appointment);
  } catch (error) { next(error); }
});

router.patch("/:id/no-show", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const filter = { _id: req.params.id, status: { $in: ["Booked", "Confirmed"] } };
    if (req.user.role === "Doctor") {
      const ownDoctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!ownDoctor) return res.status(403).json({ message: "Your doctor profile is not linked." });
      filter.doctor = ownDoctor._id;
    }
    const appointment = await Appointment.findOneAndUpdate(filter, { $set: { status: "No-show" } }, { new: true }).populate("patient", "fullName phone").populate("doctor", "fullName specialization department");
    if (!appointment) return res.status(404).json({ message: "Booked appointment not found" });
    await syncAppointmentReminder(appointment);
    res.json(appointment);
  } catch (error) { next(error); }
});

export default router;
