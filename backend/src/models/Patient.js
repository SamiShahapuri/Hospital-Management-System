import mongoose from "mongoose";
const patientSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  dateOfBirth: { type: Date },
  phone: { type: String, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true, maxlength: 300 },
  medicalHistory: [{
    diagnosis: { type: String, trim: true, maxlength: 300, default: "" },
    treatment: { type: String, trim: true, maxlength: 1000, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recordedAt: { type: Date, default: Date.now }
  }],
  prescriptions: [{ medicine: { type: String, required: true }, instructions: { type: String, default: "" }, recordedAt: { type: Date, default: Date.now } }],
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
export default mongoose.model("Patient", patientSchema);
