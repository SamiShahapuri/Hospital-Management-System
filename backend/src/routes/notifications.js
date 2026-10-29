import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/auth.js";
import Appointment from "../models/Appointment.js";
import Bill from "../models/Bill.js";

const router = Router();
router.use(authenticate);

// These are live, in-app reminders generated from stored business records.
// They are intentionally not represented as sent email/SMS notifications.
router.get("/", allowRoles("Admin", "Doctor", "Receptionist"), async (_req, res, next) => {
  try {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [appointments, unpaidBills] = await Promise.all([
      Appointment.find({ status: "Booked", scheduledAt: { $gte: now, $lte: until } })
        .populate("patient", "fullName")
        .populate("doctor", "fullName")
        .sort({ scheduledAt: 1 })
        .limit(20),
      Bill.find({ status: "Unpaid" })
        .populate("patient", "fullName")
        .sort({ issuedAt: 1 })
        .limit(20)
    ]);
    const reminders = [
      ...appointments.map((appointment) => ({
        id: `appointment-${appointment._id}`,
        type: "Appointment reminder",
        message: `${appointment.patient?.fullName || "Patient"} with ${appointment.doctor?.fullName || "doctor"}`,
        dueAt: appointment.scheduledAt,
        recordId: String(appointment._id)
      })),
      ...unpaidBills.map((bill) => ({
        id: `bill-${bill._id}`,
        type: "Payment reminder",
        message: `${bill.patient?.fullName || "Patient"} has an unpaid bill of ₹${bill.subtotal.toFixed(2)}`,
        dueAt: bill.issuedAt,
        recordId: String(bill._id)
      }))
    ].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    res.json(reminders);
  } catch (error) { next(error); }
});

export default router;
