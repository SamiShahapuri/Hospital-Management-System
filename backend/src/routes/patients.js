import { Router } from "express";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
const router = Router();
router.use(authenticate);
router.get("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = q ? { fullName: { $regex: q.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&"), $options: "i" } } : {};
    res.json(await Patient.find(filter).sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});
router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const { fullName, dateOfBirth, phone, email, address } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: "Patient name is required" });
    const patient = await Patient.create({ fullName: fullName.trim(), dateOfBirth: dateOfBirth || undefined, phone, email, address, createdBy: req.user.id });
    res.status(201).json(patient);
  } catch (e) { next(e); }
});
router.get("/:id", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
router.post("/:id/history", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!req.body.note?.trim()) return res.status(400).json({ message: "History note is required" });
    const patient = await Patient.findByIdAndUpdate(req.params.id, { $push: { medicalHistory: { note: req.body.note.trim() } } }, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
router.post("/:id/prescriptions", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!req.body.medicine?.trim()) return res.status(400).json({ message: "Medicine is required" });
    const patient = await Patient.findByIdAndUpdate(req.params.id, { $push: { prescriptions: { medicine: req.body.medicine.trim(), instructions: req.body.instructions || "" } } }, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
export default router;
