import { Router } from "express";
import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Patient from "../models/Patient.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { normalizeBillItems, parseFutureDate } from "../utils/validation.js";

const router = Router();
router.use(authenticate);

router.get("/", allowRoles("Admin", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === "Patient") {
      const ownProfile = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownProfile) return res.json([]);
      filter.patient = ownProfile._id;
    }
    if (req.query.status) {
      const status = String(req.query.status);
      if (!["Unpaid", "Partially Paid", "Paid", "Cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid bill status" });
      }
      filter.status = status;
    }
    if (req.query.patient) {
      if (!mongoose.isValidObjectId(req.query.patient)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      if (req.user.role === "Patient" && String(filter.patient) !== String(req.query.patient)) {
        return res.status(403).json({ message: "You can only view bills for your own patient profile" });
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
    const dueAt = req.body.dueAt === undefined ? new Date(Date.now() + 7 * 86400000) : parseFutureDate(req.body.dueAt);
    if (!dueAt) return res.status(400).json({ message: "Choose a valid future due date for this invoice" });
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
      patient, items: normalized.items, subtotal: normalized.subtotal, amountPaid: 0, balanceDue: normalized.subtotal, dueAt,
      notes: notes.trim(), createdBy: req.user.id
    });
    res.status(201).json(await bill.populate("patient", "fullName phone email"));
  } catch (error) { next(error); }
});

router.patch("/:id/pay", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid bill ID" });
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status === "Cancelled" || bill.status === "Paid") return res.status(409).json({ message: "Only unpaid or partially paid bills can accept another payment" });

    const balance = Number(bill.balanceDue ?? Math.max(0, bill.subtotal - (bill.amountPaid || 0)));
    const amount = req.body.amount === undefined ? balance : Number(req.body.amount);
    const mode = req.body.mode || "Cash";
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a valid payment amount greater than zero" });
    if (amount - balance > 0.001) return res.status(400).json({ message: `Payment exceeds the outstanding balance of ₹${balance.toFixed(2)}` });
    if (!["Cash", "Card", "UPI", "Bank Transfer"].includes(mode)) return res.status(400).json({ message: "Choose Cash, Card, UPI or Bank Transfer" });

    bill.amountPaid = Math.round(((bill.amountPaid || 0) + amount) * 100) / 100;
    bill.balanceDue = Math.max(0, Math.round((bill.subtotal - bill.amountPaid) * 100) / 100);
    bill.status = bill.balanceDue <= 0.001 ? "Paid" : "Partially Paid";
    bill.paymentHistory.push({ amount, mode, recordedAt: new Date(), recordedBy: req.user.id });
    if (bill.status === "Paid") bill.paidAt = new Date();
    await bill.save();
    await bill.populate("patient", "fullName phone email");
    res.json(bill);
  } catch (error) { next(error); }
});

router.patch("/:id/cancel", allowRoles("Admin", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["Unpaid", "Partially Paid"] } },
      { $set: { status: "Cancelled" } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone email");
    if (!bill) {
      const exists = await Bill.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        message: exists ? "Only unpaid or partially paid bills can be cancelled" : "Bill not found"
      });
    }
    res.json(bill);
  } catch (error) { next(error); }
});

export default router;
