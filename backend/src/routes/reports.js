import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/auth.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Admission from "../models/Admission.js";
import Bill from "../models/Bill.js";

const router = Router();
router.use(authenticate);

router.get("/summary", allowRoles("Admin"), async (_req, res, next) => {
  try {
    const [
      patients,
      doctors,
      appointmentsByStatus,
      admissionsByStatus,
      billsByStatus,
      revenueRows
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments({ active: true }),
      Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Admission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Bill.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$subtotal" } } }]),
      Bill.aggregate([
        { $match: { status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$subtotal" } } }
      ])
    ]);
    const mapCounts = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const billAmounts = Object.fromEntries(billsByStatus.map((row) => [row._id, Math.round(row.amount * 100) / 100]));
    res.json({
      generatedAt: new Date(),
      patients,
      activeDoctors: doctors,
      appointments: mapCounts(appointmentsByStatus),
      admissions: mapCounts(admissionsByStatus),
      bills: mapCounts(billsByStatus),
      billAmounts,
      paidRevenue: Math.round((revenueRows[0]?.total || 0) * 100) / 100,
      outstandingAmount: billAmounts.Unpaid || 0
    });
  } catch (error) { next(error); }
});

export default router;
