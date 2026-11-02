import mongoose from "mongoose";

const labTestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  testName: { type: String, required: true, trim: true, maxlength: 160 },
  scheduledAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["Scheduled", "In Progress", "Completed", "Cancelled"], default: "Scheduled", index: true },
  result: { type: String, trim: true, maxlength: 3000, default: "" },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

labTestSchema.index({ patient: 1, scheduledAt: -1 });
export default mongoose.model("LabTest", labTestSchema);
