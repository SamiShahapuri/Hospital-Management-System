import { Router } from "express";
import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { normalizeBillItems } from "../utils/validation.js";

const router = Router();
router.use(authenticate);

router.get("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      const status = String(req.query.status);
      if (!["Unpaid", "Paid", "Cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid bill status" });
      }
      filter.status = status;
    }
    if (req.query.patient) {
      if (!mongoose.isValidObjectId(req.query.patient)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      filter.patient = req.query.patient;
    }
    const bills = await Bill.find(filter)
      .populate("patient", "fullName phone email")
      .populate("createdBy", "name")
      .sort({ issuedAt: -1 })
      .limit(100);
    res.json(bills);
  } catch (error) { next(error); }
});

router.post("/", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    const { patient, items, notes = "" } = req.body;
    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({ message: "A valid patient ID is required" });
    }
    if (typeof notes !== "string" || notes.length > 500) {
      return res.status(400).json({ message: "Notes must be text up to 500 characters" });
    }
    const normalized = normalizeBillItems(items);
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    const patientExists = await Patient.exists({ _id: patient });
    if (!patientExists) return res.status(404).json({ message: "Patient not found" });

    const bill = await Bill.create({
      patient, items: normalized.items, subtotal: normalized.subtotal, notes: notes.trim(), createdBy: req.user.id
    });
    res.status(201).json(await bill.populate("patient", "fullName phone email"));
  } catch (error) { next(error); }
});

router.patch("/:id/pay", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, status: "Unpaid" },
      { $set: { status: "Paid", paidAt: new Date() } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone email");
    if (!bill) {
      const exists = await Bill.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        message: exists ? "Only unpaid bills can be marked as paid" : "Bill not found"
      });
    }
    res.json(bill);
  } catch (error) { next(error); }
});

router.patch("/:id/cancel", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, status: "Unpaid" },
      { $set: { status: "Cancelled" } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone email");
    if (!bill) {
      const exists = await Bill.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        message: exists ? "Only unpaid bills can be cancelled" : "Bill not found"
      });
    }
    res.json(bill);
  } catch (error) { next(error); }
});

export default router;
