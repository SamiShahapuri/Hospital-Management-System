import { Router } from "express";
import mongoose from "mongoose";
import Department from "../models/Department.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (_req, res, next) => {
  try {
    res.json(await Department.find({ active: true }).sort({ name: 1 }).limit(100));
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin"), async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (!name) return res.status(400).json({ message: "Department name is required" });
    const department = await Department.create({ name, description });
    res.status(201).json(department);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Department already exists" });
    next(error);
  }
});

router.patch("/:id", allowRoles("Admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid department ID" });
    const updates = {};
    if ("name" in req.body) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).json({ message: "Department name is required" });
      }
      updates.name = req.body.name.trim();
    }
    if ("description" in req.body) {
      if (typeof req.body.description !== "string") return res.status(400).json({ message: "Description must be text" });
      updates.description = req.body.description.trim();
    }
    const department = await Department.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json(department);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Department already exists" });
    next(error);
  }
});

router.delete("/:id", allowRoles("Admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid department ID" });
    const department = await Department.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department deactivated", department });
  } catch (error) { next(error); }
});

export default router;
