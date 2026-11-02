import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/auth.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Admission from "../models/Admission.js";
import Bill from "../models/Bill.js";
import LabTest from "../models/LabTest.js";

const router = Router();
router.use(authenticate);

function dateRange(fromText, toText) {
  const from = fromText ? new Date(`${fromText}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400000);
  const to = toText ? new Date(`${toText}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  to.setUTCDate(to.getUTCDate() + 1);
  return { $gte: from, $lt: to };
}

router.get("/summary", allowRoles("Admin"), async (_req, res, next) => {
  try {
    const [patients, doctors, appointmentsByStatus, admissionsByStatus, billsByStatus, revenueRows] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments({ active: true }),
      Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Admission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Bill.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$balanceDue" } } }]),
      Bill.aggregate([{ $group: { _id: null, total: { $sum: "$amountPaid" } } }])
    ]);
    const mapCounts = rows => Object.fromEntries(rows.map(row => [row._id, row.count]));
    const billAmounts = Object.fromEntries(billsByStatus.map(row => [row._id, Math.round(row.amount * 100) / 100]));
    res.json({ generatedAt: new Date(), patients, activeDoctors: doctors, appointments: mapCounts(appointmentsByStatus), admissions: mapCounts(admissionsByStatus), bills: mapCounts(billsByStatus), billAmounts, paidRevenue: Math.round((revenueRows[0]?.total || 0) * 100) / 100, outstandingAmount: (billAmounts.Unpaid || 0) + (billAmounts["Partially Paid"] || 0) });
  } catch (error) { next(error); }
});

router.get("/detail", allowRoles("Admin"), async (req, res, next) => {
  try {
    const type = String(req.query.type || "appointments");
    const range = dateRange(req.query.from, req.query.to);
    if (!range) return res.status(400).json({ message: "Choose a valid date range where the start is not after the end." });
    if (!["patients", "doctors", "appointments", "admissions", "payments", "labTests"].includes(type)) {
      return res.status(400).json({ message: "Choose patients, doctors, appointments, admissions, payments or lab tests." });
    }

    let rows = [];
    let summary = {};
    if (type === "patients") {
      rows = await Patient.find({ createdAt: range }).select("patientId fullName email phone createdAt").sort({ createdAt: -1 }).limit(5000);
      summary = { total: rows.length };
    } else if (type === "doctors") {
      const filter = { scheduledAt: range, status: "Completed" };
      if (req.query.doctor) filter.doctor = req.query.doctor;
      const counts = await Appointment.aggregate([{ $match: filter }, { $group: { _id: "$doctor", appointmentCount: { $sum: 1 } } }]);
      const countMap = new Map(counts.map(row => [String(row._id), row.appointmentCount]));
      const doctorFilter = req.query.doctor ? { _id: req.query.doctor } : { active: true };
      const doctors = await Doctor.find(doctorFilter).select("fullName specialization department active").sort({ fullName: 1 }).limit(200);
      rows = doctors.map(doctor => ({ _id: doctor._id, fullName: doctor.fullName, specialization: doctor.specialization, department: doctor.department, appointmentCount: countMap.get(String(doctor._id)) || 0 }));
      summary = { doctors: rows.length, completedAppointments: rows.reduce((sum, row) => sum + row.appointmentCount, 0) };
    } else if (type === "appointments") {
      const filter = { scheduledAt: range };
      if (req.query.status) {
        const allowed = ["Booked", "Confirmed", "Completed", "Cancelled", "No-show"];
        if (!allowed.includes(String(req.query.status))) return res.status(400).json({ message: "Invalid appointment status" });
        filter.status = String(req.query.status);
      }
      if (req.query.doctor) filter.doctor = req.query.doctor;
      rows = await Appointment.find(filter).populate("patient", "patientId fullName").populate("doctor", "fullName department").sort({ scheduledAt: -1 }).limit(5000);
      summary = { total: rows.length, status: req.query.status || "All" };
    } else if (type === "admissions") {
      rows = await Admission.find({ admittedAt: range }).populate("patient", "patientId fullName").populate({ path: "bed", populate: { path: "room", populate: { path: "ward", select: "name" } } }).sort({ admittedAt: -1 }).limit(5000);
      summary = { total: rows.length, admitted: rows.filter(row => row.status === "Admitted").length, discharged: rows.filter(row => row.status === "Discharged").length };
    } else if (type === "labTests") {
      const filter = { scheduledAt: range };
      if (req.query.status) {
        if (!["Scheduled", "In Progress", "Completed", "Cancelled"].includes(String(req.query.status))) return res.status(400).json({ message: "Invalid lab test status" });
        filter.status = String(req.query.status);
      }
      rows = await LabTest.find(filter).populate("patient", "patientId fullName").populate("requestedBy", "name").sort({ scheduledAt: -1 }).limit(5000);
      summary = { total: rows.length, completed: rows.filter(row => row.status === "Completed").length, scheduled: rows.filter(row => row.status === "Scheduled").length };
    } else if (type === "payments") {
      const bills = await Bill.find({ "paymentHistory.recordedAt": range }).populate("patient", "patientId fullName").sort({ updatedAt: -1 }).limit(5000);
      rows = bills.flatMap(bill => bill.paymentHistory.filter(payment => payment.recordedAt >= range.$gte && payment.recordedAt < range.$lt).map(payment => ({
        _id: `${bill._id}-${payment._id}`, billId: bill._id, patient: bill.patient, amount: payment.amount, mode: payment.mode, paidAt: payment.recordedAt, status: bill.status
      })));
      summary = { total: rows.length, paidAmount: Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100 };
    }
    res.json({ type, from: range.$gte, to: new Date(range.$lt.getTime() - 1), generatedAt: new Date(), summary, rows });
  } catch (error) { next(error); }
});

export default router;
