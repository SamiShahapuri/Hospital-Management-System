import { Router } from "express";
import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

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
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ message: "Add between 1 and 20 bill items" });
    }
    if (typeof notes !== "string" || notes.length > 500) {
      return res.status(400).json({ message: "Notes must be text up to 500 characters" });
    }
    const patientExists = await Patient.exists({ _id: patient });
    if (!patientExists) return res.status(404).json({ message: "Patient not found" });

    const normalizedItems = [];
    for (const item of items) {
      const description = typeof item.description === "string" ? item.description.trim() : "";
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!description || description.length > 200 ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 ||
          !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1000000) {
        return res.status(400).json({
          message: "Each item needs a description, whole-number quantity, and valid non-negative unit price"
        });
      }
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      normalizedItems.push({ description, quantity, unitPrice, lineTotal });
    }
    const subtotal = Math.round(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const bill = await Bill.create({
      patient, items: normalizedItems, subtotal, notes: notes.trim(), createdBy: req.user.id
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
