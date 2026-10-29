import { Router } from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

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
    appointmentTime: `${values.hour}:${values.minute}`
  };
}

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      const status = String(req.query.status);
      if (!["Booked", "Cancelled", "Completed"].includes(status)) {
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
    if (req.user.role === "Patient") {
      const account = await User.findById(req.user.id).select("email");
      const ownProfile = account?.email ? await Patient.findOne({ email: account.email }) : null;
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
      const account = await User.findById(req.user.id).select("email");
      const ownProfile = account?.email ? await Patient.findOne({ email: account.email }) : null;
      if (!ownProfile || String(ownProfile._id) !== String(patient)) {
        return res.status(403).json({ message: "You can only book appointments for your own patient profile" });
      }
    }
    const date = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(date.getTime()) || date <= new Date()) {
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

    // Check whether the appointment falls within the doctor's availability.
    const { dayOfWeek, appointmentTime } = getHospitalScheduleParts(date);

    const available = doctorRecord.availability.some((slot) =>
      slot.dayOfWeek === dayOfWeek &&
      appointmentTime >= slot.startTime &&
      appointmentTime < slot.endTime
    );

    if (!available) {
      return res.status(400).json({
        message: "Doctor is not available at the requested appointment time"
      });
    }

    const conflict = await Appointment.exists({
      doctor, scheduledAt: date, status: "Booked"
    });
    if (conflict) return res.status(409).json({ message: "Doctor already has an appointment at this time" });
    const appointment = await Appointment.create({
      patient, doctor, scheduledAt: date, reason: reason.trim(), createdBy: req.user.id
    });
    res.status(201).json(await appointment.populate([
      { path: "patient", select: "fullName phone" },
      { path: "doctor", select: "fullName specialization department" }
    ]));
  } catch (error) {
    // The unique partial index is the race-safe guard; translate its conflict to HTTP 409.
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
      const account = await User.findById(req.user.id).select("email");
      const ownProfile = account?.email ? await Patient.findOne({ email: account.email }) : null;
      if (!ownProfile || String(appointment.patient) !== String(ownProfile._id)) {
        return res.status(403).json({ message: "You can only cancel your own appointments" });
      }
    }
    if (appointment.status !== "Booked") {
      return res.status(409).json({ message: "Only booked appointments can be cancelled" });
    }
    appointment.status = "Cancelled";
    await appointment.save();
    await appointment.populate([
      { path: "patient", select: "fullName phone" },
      { path: "doctor", select: "fullName specialization department" }
    ]);
    res.json(appointment);
  } catch (error) { next(error); }
});

router.patch("/:id/complete", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment ID" });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, status: "Booked" },
      { status: "Completed" },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone").populate("doctor", "fullName specialization department");
    if (!appointment) return res.status(404).json({ message: "Booked appointment not found" });
    res.json(appointment);
  } catch (error) { next(error); }
});

export default router;
