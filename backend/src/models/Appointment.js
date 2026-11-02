import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, min: 5, max: 180, default: 30 },
  slotKeys: { type: [String], default: [] },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["Booked", "Confirmed", "Cancelled", "Completed", "No-show"], default: "Booked", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, scheduledAt: 1 }, { unique: true, partialFilterExpression: { status: "Booked" } });
// Minute keys enforce overlapping-duration exclusion at the database index level.
appointmentSchema.index({ doctor: 1, slotKeys: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["Booked", "Confirmed"] } } });
export default mongoose.model("Appointment", appointmentSchema);
