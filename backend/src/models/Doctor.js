import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  specialization: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, trim: true, maxlength: 100, default: "" },
  availability: [{
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
    endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true }
  }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

doctorSchema.index({ fullName: 1 });
doctorSchema.index({ department: 1, specialization: 1 });

export default mongoose.model("Doctor", doctorSchema);
