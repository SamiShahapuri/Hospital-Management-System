import mongoose from "mongoose";
const schema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
  bedNumber: { type: String, required: true, trim: true, maxlength: 30 },
  status: { type: String, enum: ["Available", "Reserved", "Occupied", "Cleaning", "Under Maintenance"], default: "Available", index: true },
  notes: { type: String, trim: true, maxlength: 300, default: "" }
}, { timestamps: true });
schema.index({ room: 1, bedNumber: 1 }, { unique: true });
export default mongoose.model("Bed", schema);
