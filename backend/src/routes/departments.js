import { Router } from "express";
import mongoose from "mongoose";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
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
    if (name.length > 100 || description.length > 500) {
      return res.status(400).json({ message: "Department name or description exceeds the allowed length" });
    }
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
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const updates = {};
    if ("name" in req.body) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).json({ message: "Department name is required" });
      }
      updates.name = req.body.name.trim();
      if (updates.name.length > 100) return res.status(400).json({ message: "Department name is too long" });
      if (updates.name !== department.name &&
          await Department.exists({ _id: { $ne: department._id }, name: updates.name })) {
        return res.status(409).json({ message: "Department already exists" });
      }
    }
    if ("description" in req.body) {
      if (typeof req.body.description !== "string") return res.status(400).json({ message: "Description must be text" });
      updates.description = req.body.description.trim();
      if (updates.description.length > 500) return res.status(400).json({ message: "Department description is too long" });
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Provide a department name or description to update" });
    }

    const previousName = department.name;
    Object.assign(department, updates);
    await department.save();

    // Doctor.department is stored as a department name, so keep existing records in sync on rename.
    if (previousName !== department.name) {
      await Doctor.updateMany({ department: previousName }, { $set: { department: department.name } });
    }
    res.json(department);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Department already exists" });
    next(error);
  }
});

router.delete("/:id", allowRoles("Admin"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid department ID" });
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const assignedDoctors = await Doctor.countDocuments({ department: department.name, active: true });
    if (assignedDoctors) {
      return res.status(409).json({
        message: "Reassign or deactivate active doctors before deactivating this department"
      });
    }

    department.active = false;
    await department.save();
    res.json({ message: "Department deactivated", department });
  } catch (error) { next(error); }
});

export default router;
