import { Router } from "express";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { isValidEmail } from "../utils/validation.js";
const router = Router();
router.use(authenticate);
router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q ? { fullName: { $regex: escaped, $options: "i" } } : {};
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile) return res.json([]);
      filter._id = ownProfile._id;
    }
    res.json(await Patient.find(filter).sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});
router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
    const rawDateOfBirth = req.body.dateOfBirth;
    if (!fullName) return res.status(400).json({ message: "Patient name is required" });
    if (fullName.length > 120 || phone.length > 30 || address.length > 300) {
      return res.status(400).json({ message: "Patient name, phone, or address exceeds the allowed length" });
    }
    if (phone && !/^\+?[0-9 ()-]{7,30}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }
    if (email && !isValidEmail(email)) return res.status(400).json({ message: "Enter a valid email address" });
    let dateOfBirth;
    if (rawDateOfBirth) {
      dateOfBirth = new Date(rawDateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
        return res.status(400).json({ message: "Date of birth must be a valid date in the past" });
      }
    }
    const patient = await Patient.create({
      fullName, dateOfBirth, phone: phone || undefined, email: email || undefined,
      address: address || undefined, createdBy: req.user.id
    });
    res.status(201).json(patient);
  } catch (e) { next(e); }
});
router.get("/:id", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid patient ID" });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user.role === "Patient") {
      if (String(patient.linkedUser || "") !== String(req.user.id)) {
        return res.status(403).json({ message: "You can only view your own patient record" });
      }
    }
    res.json(patient);
  } catch (e) { next(e); }
});
router.post("/:id/history", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }
    const diagnosis = typeof req.body.diagnosis === "string" ? req.body.diagnosis.trim() : "";
    const treatment = typeof req.body.treatment === "string" ? req.body.treatment.trim() : "";
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (!diagnosis && !treatment && !note) {
      return res.status(400).json({ message: "Enter a diagnosis, treatment, or clinical note" });
    }
    if (diagnosis.length > 300 || treatment.length > 1000 || note.length > 1000) {
      return res.status(400).json({ message: "Clinical record is too long" });
    }
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { medicalHistory: {
        diagnosis, treatment,
        note: note || [diagnosis && `Diagnosis: ${diagnosis}`, treatment && `Treatment: ${treatment}`].filter(Boolean).join(" | "),
        recordedBy: req.user.id,
        recordedAt: new Date()
      } } },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
router.post("/:id/prescriptions", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid patient ID" });
    const medicine = typeof req.body.medicine === "string" ? req.body.medicine.trim() : "";
    const instructions = typeof req.body.instructions === "string" ? req.body.instructions.trim() : "";
    if (!medicine) return res.status(400).json({ message: "Medicine is required" });
    if (medicine.length > 200 || instructions.length > 1000) {
      return res.status(400).json({ message: "Medicine or prescription instructions exceed the allowed length" });
    }
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { prescriptions: { medicine, instructions } } },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
export default router;
