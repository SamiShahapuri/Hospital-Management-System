import mongoose from "mongoose";
const schema = new mongoose.Schema({
  ward: { type: mongoose.Schema.Types.ObjectId, ref: "Ward", required: true, index: true },
  roomNumber: { type: String, required: true, trim: true, maxlength: 30 },
  roomType: { type: String, enum: ["Standard", "Private", "ICU", "Isolation", "Maternity", "Other"], default: "Standard" },
  bedCount: { type: Number, required: true, min: 1, max: 20 },
  dailyRate: { type: Number, min: 0, max: 100000, default: 1200 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ ward: 1, roomNumber: 1 }, { unique: true });
export default mongoose.model("Room", schema);
