import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  roomNumber: { type: String, required: true, trim: true, maxlength: 30 },
  bedNumber: { type: String, required: true, trim: true, maxlength: 30 },
  status: { type: String, enum: ["Admitted", "Discharged"], default: "Admitted", index: true },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: { type: Date, default: null },
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

// A room/bed can have historical discharged records, but only one active occupant.
admissionSchema.index(
  { roomNumber: 1, bedNumber: 1 },
  { unique: true, partialFilterExpression: { status: "Admitted" } }
);

export default mongoose.model("Admission", admissionSchema);
