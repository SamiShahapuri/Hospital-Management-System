import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
  wardType: { type: String, enum: ["General", "Private", "ICU", "Emergency", "Maternity", "Pediatric", "Other"], default: "General" },
  capacity: { type: Number, required: true, min: 1, max: 500 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ department: 1, name: 1 }, { unique: true });
export default mongoose.model("Ward", schema);
