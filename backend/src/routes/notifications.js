import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/auth.js";
import Appointment from "../models/Appointment.js";
import Bill from "../models/Bill.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import LabTest from "../models/LabTest.js";

const router = Router();
router.use(authenticate);

// Live, in-app reminders are derived from business records. They are not represented as sent email/SMS messages.
router.get("/", allowRoles("Admin", "Doctor", "Receptionist", "Patient"), async (req, res, next) => {
  try {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const recentlyChanged = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const appointmentFilter = { status: { $in: ["Booked", "Confirmed"] }, scheduledAt: { $gt: now }, $or: [
      { scheduledAt: { $gte: now, $lte: until } },
      { updatedAt: { $gte: recentlyChanged } }
    ] };
    const labFilter = { status: "Scheduled", scheduledAt: { $gt: now }, $or: [
      { scheduledAt: { $gte: now, $lte: until } },
      { createdAt: { $gte: recentlyChanged } }
    ] };
    let ownPatient = null;

    if (req.user.role === "Patient") {
      ownPatient = await Patient.findOne({ linkedUser: req.user.id });
      if (!ownPatient) return res.json([]);
      appointmentFilter.patient = ownPatient._id;
      labFilter.patient = ownPatient._id;
    } else if (req.user.role === "Doctor") {
      const doctor = await Doctor.findOne({ linkedUser: req.user.id, active: true });
      if (!doctor) return res.json([]);
      appointmentFilter.doctor = doctor._id;
      labFilter.patient = { $in: await Appointment.distinct("patient", { doctor: doctor._id }) };
    }

    const [appointments, unpaidBills, labTests] = await Promise.all([
      Appointment.find(appointmentFilter)
        .populate("patient", "fullName")
        .populate("doctor", "fullName")
        .sort({ scheduledAt: 1 })
        .limit(50),
      req.user.role === "Admin" || req.user.role === "Receptionist" || req.user.role === "Patient"
        ? Bill.find({ status: { $in: ["Unpaid", "Partially Paid"] }, dueAt: { $gte: now, $lte: until }, ...(ownPatient ? { patient: ownPatient._id } : {}) })
          .populate("patient", "fullName")
          .sort({ issuedAt: 1 })
          .limit(50)
        : Promise.resolve([]),
      LabTest.find(labFilter).populate("patient", "fullName").sort({ scheduledAt: 1 }).limit(50)
    ]);

    const reminders = [
      ...appointments.map(appointment => ({
        id: `appointment-${appointment._id}`,
        type: "Appointment reminder",
        message: `${appointment.patient?.fullName || "Patient"} with ${appointment.doctor?.fullName || "doctor"}`,
        dueAt: appointment.scheduledAt,
        recordId: String(appointment._id)
      })),
      ...labTests.map(test => ({
        id: `lab-${test._id}`,
        type: "Lab test reminder",
        message: `${test.testName} for ${test.patient?.fullName || "Patient"}`,
        dueAt: test.scheduledAt,
        recordId: String(test._id)
      })),
      ...unpaidBills.map(bill => ({
        id: `bill-${bill._id}`,
        type: "Payment reminder",
        message: `${bill.patient?.fullName || "Patient"} has ₹${Number(bill.balanceDue ?? bill.subtotal).toFixed(2)} remaining on a bill due soon`,
        dueAt: bill.dueAt,
        recordId: String(bill._id)
      }))
    ].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    res.json(reminders);
  } catch (error) { next(error); }
});

export default router;
