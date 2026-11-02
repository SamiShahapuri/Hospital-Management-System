import { Router } from "express";
import mongoose from "mongoose";
import LabTest from "../models/LabTest.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { parseFutureDate } from "../utils/validation.js";

const router = Router();
router.use(authenticate);
const validId = mongoose.isValidObjectId;

async function doctorPatientIds(userId) {
  const doctor = await Doctor.findOne({ linkedUser: userId, active: true });
  if (!doctor) return [];
  return Appointment.distinct("patient", { doctor: doctor._id });
}

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!["Scheduled", "In Progress", "Completed", "Cancelled"].includes(String(req.query.status))) {
        return res.status(400).json({ message: "Invalid lab test status" });
      }
      filter.status = String(req.query.status);
    }
    if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ linkedUser: req.user.id });
      if (!patient) return res.json([]);
      filter.patient = patient._id;
    } else if (req.user.role === "Doctor") {
      filter.patient = { $in: await doctorPatientIds(req.user.id) };
    }
    const rows = await LabTest.find(filter)
      .populate("patient", "patientId fullName phone")
      .populate("requestedBy", "name role")
      .sort({ scheduledAt: -1 })
      .limit(500);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const { patient, testName, scheduledAt, notes = "" } = req.body;
    const name = typeof testName === "string" ? testName.trim() : "";
    if (!validId(patient)) return res.status(400).json({ message: "Choose a registered patient" });
    if (!name || name.length > 160) return res.status(400).json({ message: "Test name is required and must be 160 characters or fewer" });
    if (typeof notes !== "string" || notes.length > 1000) return res.status(400).json({ message: "Notes must be text up to 1,000 characters" });
    const time = parseFutureDate(scheduledAt);
    if (!time) return res.status(400).json({ message: "Choose a valid future date and time for the lab test" });
    if (!(await Patient.exists({ _id: patient }))) return res.status(404).json({ message: "Patient not found" });
    if (req.user.role === "Doctor") {
      const doctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!doctor || !(await Appointment.exists({ doctor: doctor._id, patient }))) {
        return res.status(403).json({ message: "You can only order tests for patients assigned to your appointments" });
      }
    }
    const row = await LabTest.create({ patient, testName: name, scheduledAt: time, notes: notes.trim(), requestedBy: req.user.id });
    res.status(201).json(await row.populate([{ path: "patient", select: "patientId fullName phone" }, { path: "requestedBy", select: "name role" }]));
  } catch (error) { next(error); }
});

router.patch("/:id", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid lab test ID" });
    const updates = {};
    if ("status" in req.body) {
      if (!["In Progress", "Completed", "Cancelled"].includes(req.body.status)) return res.status(400).json({ message: "Choose In Progress, Completed or Cancelled" });
      updates.status = req.body.status;
    }
    if ("result" in req.body) {
      if (typeof req.body.result !== "string" || req.body.result.length > 3000) return res.status(400).json({ message: "Result must be text up to 3,000 characters" });
      updates.result = req.body.result.trim();
    }
    if (updates.status === "Completed" && !updates.result) return res.status(400).json({ message: "Enter the lab result before completing the test" });
    if (updates.status === "Completed") updates.completedAt = new Date();
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a status or result update" });
    const row = await LabTest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["Scheduled", "In Progress"] } },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("patient", "patientId fullName phone");
    if (!row) return res.status(404).json({ message: "Active lab test not found" });
    res.json(row);
  } catch (error) { next(error); }
});

export default router;
