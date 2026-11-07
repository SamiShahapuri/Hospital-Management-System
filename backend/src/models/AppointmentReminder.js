import mongoose from "mongoose";

const appointmentReminderSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
  eventKey: { type: String, required: true, unique: true },
  scheduledAt: { type: Date, required: true, index: true },
  message: { type: String, required: true, maxlength: 500 },
  status: { type: String, enum: ["Pending", "Cancelled", "Superseded", "Expired"], default: "Pending", index: true }
}, { timestamps: true });

appointmentReminderSchema.index({ patient: 1, status: 1, scheduledAt: 1 });

export default mongoose.model("AppointmentReminder", appointmentReminderSchema);
