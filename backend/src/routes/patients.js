import { Router } from "express";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { isValidEmail } from "../utils/validation.js";
import { validateProfileUpdates } from "../utils/profileValidation.js";
const router = Router();
router.use(authenticate);

async function doctorHasPatientAccess(user, patientId) {
  if (user.role !== "Doctor") return true;
  const doctor = await Doctor.findOne({ linkedUser: user.id, active: true });
  if (!doctor) return false;
  return Boolean(await Appointment.exists({ doctor: doctor._id, patient: patientId }));
}
router.get("/me/profile", allowRoles("Patient"), async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ linkedUser: req.user.id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });
    res.json(patient);
  } catch (error) { next(error); }
});

router.patch("/me/profile", allowRoles("Patient"), async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ linkedUser: req.user.id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });
    const result = validateProfileUpdates(req.body, { allowAddress: true });
    if (result.error) return res.status(400).json({ message: result.error });
    if (result.updates.email) {
      const duplicate = await User.exists({ email: result.updates.email, _id: { $ne: req.user.id } });
      if (duplicate) return res.status(409).json({ message: "That email is already used by another account." });
      await User.findByIdAndUpdate(req.user.id, { email: result.updates.email });
    }
    const updated = await Patient.findByIdAndUpdate(patient._id, { $set: result.updates }, { new: true, runValidators: true });
    res.json(updated);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That email is already used by another account." });
    next(error);
  }
});

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q ? { $or: [
      { fullName: { $regex: escaped, $options: "i" } },
      { patientId: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } }
    ] } : {};
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile) return res.json([]);
      filter._id = ownProfile._id;
    }
    if (req.user.role === "Doctor") {
      const doctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!doctor) return res.json([]);
      const patientIds = await Appointment.distinct("patient", { doctor: doctor._id });
      filter._id = { $in: patientIds };
    }
    res.json(await Patient.find(filter).select("-photo").sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});
router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
    const rawDateOfBirth = req.body.dateOfBirth;
    const age = req.body.age === undefined || req.body.age === "" ? undefined : Number(req.body.age);
    const gender = typeof req.body.gender === "string" ? req.body.gender.trim() : "";
    if (!fullName) return res.status(400).json({ message: "Patient name is required" });
    if (fullName.length > 120 || phone.length > 30 || address.length > 300) {
      return res.status(400).json({ message: "Patient name, phone, or address exceeds the allowed length" });
    }
    if (phone && !/^\+?[0-9 ()-]{7,30}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }
    if (email && !isValidEmail(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 120)) return res.status(400).json({ message: "Enter a valid age between 0 and 120" });
    if (gender && !["Male", "Female", "Other", "Prefer not to say"].includes(gender)) return res.status(400).json({ message: "Choose a valid gender" });
    let dateOfBirth;
    if (rawDateOfBirth) {
      dateOfBirth = new Date(rawDateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
        return res.status(400).json({ message: "Date of birth must be a valid date in the past" });
      }
    }
    const duplicateFilter = [];
    if (phone) duplicateFilter.push({ phone });
    if (email) duplicateFilter.push({ email });
    if (duplicateFilter.length) {
      const possibleDuplicate = await Patient.findOne({ $or: duplicateFilter }).select("patientId fullName phone email");
      if (possibleDuplicate) {
        return res.status(409).json({
          message: `A possible duplicate patient already exists: ${possibleDuplicate.fullName} (${possibleDuplicate.patientId || "existing record"}). Check the hospital record before registering again.`,
          duplicate: possibleDuplicate
        });
      }
    }
    const patientId = `PT-${randomBytes(3).toString("hex").toUpperCase()}`;
    const patient = await Patient.create({
      patientId, fullName, dateOfBirth, age, gender, phone: phone || undefined, email: email || undefined,
      address: address || undefined, createdBy: req.user.id
    });
    res.status(201).json(patient);
  } catch (e) { next(e); }
});
router.patch("/:id", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid patient ID" });
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const updates = {};
    for (const field of ["fullName", "phone", "email", "address"]) {
      if (!(field in req.body)) continue;
      if (typeof req.body[field] !== "string") return res.status(400).json({ message: `${field} must be text` });
      const value = req.body[field].trim();
      if (field === "fullName" && (!value || value.length > 120)) return res.status(400).json({ message: "Patient name is required (maximum 120 characters)" });
      if (field === "phone" && value && !/^\+?[0-9 ()-]{7,30}$/.test(value)) return res.status(400).json({ message: "Enter a valid phone number" });
      if (field === "email" && value && !isValidEmail(value)) return res.status(400).json({ message: "Enter a valid email address" });
      if (field === "address" && value.length > 300) return res.status(400).json({ message: "Address is too long" });
      updates[field] = field === "email" ? value.toLowerCase() : value;
    }
    if ("age" in req.body) {
      const age = req.body.age === "" || req.body.age === null ? undefined : Number(req.body.age);
      if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 120)) return res.status(400).json({ message: "Enter a valid age between 0 and 120" });
      updates.age = age;
    }
    if ("gender" in req.body) {
      if (typeof req.body.gender !== "string" || !["Male", "Female", "Other", "Prefer not to say", ""].includes(req.body.gender.trim())) return res.status(400).json({ message: "Choose a valid gender" });
      updates.gender = req.body.gender.trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide patient details to update" });
    if (updates.email && await Patient.exists({ email: updates.email, _id: { $ne: patient._id } })) {
      return res.status(409).json({ message: "That email is already used by another patient" });
    }
    if (patient.linkedUser && updates.email) {
      const duplicateAccount = await User.exists({ email: updates.email, _id: { $ne: patient.linkedUser } });
      if (duplicateAccount) return res.status(409).json({ message: "That email is already used by another account" });
      await User.findByIdAndUpdate(patient.linkedUser, { email: updates.email });
    }
    if (patient.linkedUser && updates.fullName) await User.findByIdAndUpdate(patient.linkedUser, { name: updates.fullName });
    Object.assign(patient, updates);
    await patient.save();
    res.json(patient);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That patient contact detail is already in use" });
    next(error);
  }
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
    if (req.user.role === "Doctor" && !(await doctorHasPatientAccess(req.user, patient._id))) {
      return res.status(403).json({ message: "You can only view patients assigned to your appointments." });
    }
    res.json(patient);
  } catch (e) { next(e); }
});
router.post("/:id/history", allowRoles("Admin", "Doctor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }
    if (req.user.role === "Doctor" && !(await doctorHasPatientAccess(req.user, req.params.id))) {
      return res.status(403).json({ message: "You can only update patients assigned to your appointments." });
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
    if (req.user.role === "Doctor" && !(await doctorHasPatientAccess(req.user, req.params.id))) {
      return res.status(403).json({ message: "You can only update patients assigned to your appointments." });
    }
    const medicine = typeof req.body.medicine === "string" ? req.body.medicine.trim() : "";
    const dosage = typeof req.body.dosage === "string" ? req.body.dosage.trim() : "";
    const frequency = typeof req.body.frequency === "string" ? req.body.frequency.trim() : "";
    const duration = typeof req.body.duration === "string" ? req.body.duration.trim() : "";
    const instructions = typeof req.body.instructions === "string" ? req.body.instructions.trim() : "";
    if (!medicine) return res.status(400).json({ message: "Medicine is required" });
    if (medicine.length > 200 || dosage.length > 100 || frequency.length > 100 || duration.length > 100 || instructions.length > 1000) {
      return res.status(400).json({ message: "Medicine or prescription details exceed the allowed length" });
    }
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $push: { prescriptions: { medicine, dosage, frequency, duration, instructions } } },
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (e) { next(e); }
});
export default router;
