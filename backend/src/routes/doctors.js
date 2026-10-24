import { Router } from "express";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

function validAvailability(availability) {
  if (availability === undefined) return true;
  if (!Array.isArray(availability)) return false;
  return availability.every((slot) =>
    Number.isInteger(slot.dayOfWeek) &&
    slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime || "") &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime || "") &&
    slot.startTime < slot.endTime
  );
}

router.get("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.department) filter.department = String(req.query.department).trim();
    if (req.query.specialization) filter.specialization = String(req.query.specialization).trim();
    if (req.query.q) {
      const q = String(req.query.q).trim().replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
      filter.fullName = { $regex: q, $options: "i" };
    }
    res.json(await Doctor.find(filter).sort({ fullName: 1 }).limit(100));
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const specialization = typeof req.body.specialization === "string" ? req.body.specialization.trim() : "";
    const department = typeof req.body.department === "string" ? req.body.department.trim() : "";
    if (!fullName || !specialization) {
      return res.status(400).json({ message: "Doctor name and specialization are required" });
    }
    if (!validAvailability(req.body.availability)) {
      return res.status(400).json({ message: "Availability must contain valid weekdays and start/end times" });
    }
    const doctor = await Doctor.create({
      fullName, specialization, department,
      availability: req.body.availability || []
    });
    res.status(201).json(doctor);
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
        if (typeof req.body[field] !== "string" || !req.body[field].trim()) {
          return res.status(400).json({ message: `${field} must be a non-empty string` });
        }
        updates[field] = req.body[field].trim();
      }
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
