import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["Booked", "Cancelled", "Completed"], default: "Booked", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, scheduledAt: 1, status: 1 });

export default mongoose.model("Appointment", appointmentSchema);
