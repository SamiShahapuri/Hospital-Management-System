import mongoose from "mongoose";
const patientSchema = new mongoose.Schema({
  patientId: { type: String, trim: true, uppercase: true, unique: true, sparse: true, maxlength: 32 },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  dateOfBirth: { type: Date },
  age: { type: Number, min: 0, max: 120 },
  gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say", ""], default: "" },
  phone: { type: String, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true },
  bloodGroup: { type: String, trim: true, maxlength: 3, default: "" },
  photo: { type: String, default: "" },
  address: { type: String, trim: true, maxlength: 300 },
  medicalHistory: [{
    diagnosis: { type: String, trim: true, maxlength: 300, default: "" },
    treatment: { type: String, trim: true, maxlength: 1000, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recordedAt: { type: Date, default: Date.now }
  }],
  prescriptions: [{ medicine: { type: String, required: true }, dosage: { type: String, default: "" }, frequency: { type: String, default: "" }, duration: { type: String, default: "" }, instructions: { type: String, default: "" }, recordedAt: { type: Date, default: Date.now } }],
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
export default mongoose.model("Patient", patientSchema);
