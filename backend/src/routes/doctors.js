import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { validateProfileUpdates } from "../utils/profileValidation.js";
import { isValidPassword } from "../utils/validation.js";

const router = Router();
router.use(authenticate);

export function validAvailability(availability) {
  if (availability === undefined) return true;
  if (!Array.isArray(availability)) return false;
  return availability.every((slot) =>
    slot && typeof slot === "object" &&
    Number.isInteger(slot.dayOfWeek) &&
    slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime || "") &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime || "") &&
    slot.startTime < slot.endTime
  );
}

async function currentDoctor(req) {
  let doctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
  if (!doctor) {
    const escaped = String(req.user.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = await Doctor.find({ fullName: { $regex: `^${escaped}$`, $options: "i" }, active: true }).limit(2);
    if (matches.length === 1) {
      doctor = matches[0];
      doctor.linkedUser = req.user.id;
      doctor.email = req.user.email || doctor.email;
      await doctor.save();
    }
  }
  return doctor;
}

router.get("/me/profile", allowRoles("Doctor"), async (req, res, next) => {
  try {
    const doctor = await currentDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Your doctor profile is not linked. Ask the administrator to link your account." });
    res.json(doctor);
  } catch (error) { next(error); }
});

router.patch("/me/profile", allowRoles("Doctor"), async (req, res, next) => {
  try {
    const doctor = await currentDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Your doctor profile is not linked. Ask the administrator to link your account." });
    const result = validateProfileUpdates(req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    if (result.updates.email) {
      const duplicate = await User.exists({ email: result.updates.email, _id: { $ne: req.user.id } });
      if (duplicate) return res.status(409).json({ message: "That email is already used by another account." });
      await User.findByIdAndUpdate(req.user.id, { email: result.updates.email });
    }
    const updated = await Doctor.findByIdAndUpdate(doctor._id, { $set: result.updates }, { new: true, runValidators: true });
    res.json(updated);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That email is already used by another account." });
    next(error);
  }
});

router.patch("/me/availability", allowRoles("Doctor"), async (req, res, next) => {
  try {
    const doctor = await currentDoctor(req);
    if (!doctor) return res.status(404).json({ message: "Your doctor profile is not linked." });
    if (!validAvailability(req.body.availability)) return res.status(400).json({ message: "Availability must contain valid weekdays and start/end times" });
    const updates = { availability: req.body.availability };
    if ("consultationDuration" in req.body) {
      const duration = Number(req.body.consultationDuration);
      if (![15,20,30,45,60].includes(duration)) return res.status(400).json({ message: "Consultation duration must be 15, 20, 30, 45 or 60 minutes" });
      updates.consultationDuration = duration;
    }
    const updated = await Doctor.findByIdAndUpdate(doctor._id, { $set: updates }, { new: true, runValidators: true });
    res.json(updated);
  } catch (error) { next(error); }
});

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.department) filter.department = String(req.query.department).trim();
    if (req.query.specialization) filter.specialization = String(req.query.specialization).trim();
    if (req.query.q) {
      const q = String(req.query.q).trim().replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
      filter.fullName = { $regex: q, $options: "i" };
    }
    res.json(await Doctor.find(filter).select("fullName specialization department availability consultationDuration active").sort({ fullName: 1 }).limit(100));
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const specialization = typeof req.body.specialization === "string" ? req.body.specialization.trim() : "";
    const department = typeof req.body.department === "string" ? req.body.department.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const username = (typeof req.body.username === "string" && req.body.username.trim() ? req.body.username.trim() : email.split("@")[0]).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!fullName || !specialization) {
      return res.status(400).json({ message: "Doctor name and specialization are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: "A valid doctor login email is required" });
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ message: "Doctor username must be 3–32 letters, numbers, dots, underscores or hyphens" });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "Set an initial doctor password between 8 and 128 characters" });
    }
    if (await User.exists({ $or: [{ email }, { username }] })) return res.status(409).json({ message: "That email or username is already used by another account" });
    if (!validAvailability(req.body.availability)) {
      return res.status(400).json({ message: "Availability must contain valid weekdays and start/end times" });
    }
    if (department && !(await Department.exists({ name: department, active: true }))) {
      return res.status(400).json({ message: "Choose an existing active department" });
    }
    const account = await User.create({
      name: fullName, email, username, passwordHash: await bcrypt.hash(password, 12), role: "Doctor"
    });
    try {
      const doctor = await Doctor.create({
        fullName, specialization, department, email, linkedUser: account._id,
        availability: req.body.availability || [],
        consultationDuration: [15,20,30,45,60].includes(Number(req.body.consultationDuration)) ? Number(req.body.consultationDuration) : 30
      });
      res.status(201).json({ doctor, account: { email, username, role: "Doctor" }, message: "Doctor profile and login account created." });
    } catch (doctorError) {
      await User.deleteOne({ _id: account._id });
      throw doctorError;
    }
  } catch (error) { next(error); }
});

router.patch("/:id", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }
    const updates = {};
    for (const field of ["fullName", "specialization", "department"]) {
      if (field in req.body) {
        if (typeof req.body[field] !== "string") {
          return res.status(400).json({ message: `${field} must be text` });
        }
        const value = req.body[field].trim();
        if (field !== "department" && !value) {
          return res.status(400).json({ message: `${field} must be a non-empty string` });
        }
        updates[field] = value;
      }
    }
    if ("department" in updates && updates.department &&
        !(await Department.exists({ name: updates.department, active: true }))) {
      return res.status(400).json({ message: "Choose an existing active department" });
    }
    if ("consultationDuration" in req.body) {
      const duration = Number(req.body.consultationDuration);
      if (![15, 20, 30, 45, 60].includes(duration)) return res.status(400).json({ message: "Consultation duration must be 15, 20, 30, 45 or 60 minutes" });
      updates.consultationDuration = duration;
    }
    if ("availability" in req.body) {
      if (!validAvailability(req.body.availability)) {
        return res.status(400).json({ message: "Availability must contain valid weekdays and start/end times" });
      }
      updates.availability = req.body.availability;
    }
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (error) { next(error); }
});

router.delete("/:id", allowRoles("Admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json({ message: "Doctor deactivated", doctor });
  } catch (error) { next(error); }
});

export default router;
