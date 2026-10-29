import { Router } from "express";
import mongoose from "mongoose";
import Admission from "../models/Admission.js";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      const status = String(req.query.status);
      if (!["Admitted", "Discharged"].includes(status)) {
        return res.status(400).json({ message: "Invalid admission status" });
      }
      filter.status = status;
    }
    const admissions = await Admission.find(filter)
      .populate("patient", "fullName phone email")
      .populate("admittedBy", "name")
      .sort({ admittedAt: -1 })
      .limit(100);
    res.json(admissions);
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const { patient, roomNumber, bedNumber } = req.body;
    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({ message: "A valid patient ID is required" });
    }
    if (typeof roomNumber !== "string" || !roomNumber.trim() ||
        typeof bedNumber !== "string" || !bedNumber.trim()) {
      return res.status(400).json({ message: "Room number and bed number are required" });
    }
    const [patientExists, activeBed] = await Promise.all([
      Patient.exists({ _id: patient }),
      Admission.exists({ roomNumber: roomNumber.trim(), bedNumber: bedNumber.trim(), status: "Admitted" })
    ]);
    if (!patientExists) return res.status(404).json({ message: "Patient not found" });
    if (activeBed) return res.status(409).json({ message: "This bed is already occupied" });

    const admission = await Admission.create({
      patient,
      roomNumber: roomNumber.trim(),
      bedNumber: bedNumber.trim(),
      admittedBy: req.user.id
    });
    res.status(201).json(await admission.populate("patient", "fullName phone email"));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This bed is already occupied" });
    }
    next(error);
  }
});

router.patch("/:id/discharge", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid admission ID" });
    }
    const admission = await Admission.findOneAndUpdate(
      { _id: req.params.id, status: "Admitted" },
      { $set: { status: "Discharged", dischargedAt: new Date() } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone email");
    if (!admission) return res.status(404).json({ message: "Active admission not found" });
    res.json(admission);
  } catch (error) { next(error); }
});

export default router;
