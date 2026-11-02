import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, lowercase: true, trim: true, minlength: 3, maxlength: 32, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0 },
  role: { type: String, enum: ["Admin", "Doctor", "Receptionist", "Patient"], default: "Patient" }
}, { timestamps: true });
export default mongoose.model("User", userSchema);
