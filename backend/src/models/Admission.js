import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  bed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed", default: null },
  roomNumber: { type: String, trim: true, maxlength: 30, required: function () { return !this.bed; } },
  bedNumber: { type: String, trim: true, maxlength: 30, required: function () { return !this.bed; } },
  status: { type: String, enum: ["Admitted", "Discharged"], default: "Admitted", index: true },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: { type: Date, default: null },
  dischargeSummary: { type: String, trim: true, maxlength: 2000, default: "" },
  treatments: [{
    description: { type: String, required: true, trim: true, maxlength: 300 },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recordedAt: { type: Date, default: Date.now }
  }],
  roomChargeBill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", default: null },
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  transferHistory: [{ fromBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" }, toBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" }, transferredAt: { type: Date, default: Date.now }, transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }]
}, { timestamps: true });

admissionSchema.index({ roomNumber:  1, bedNumber: 1 }, { unique: true, partialFilterExpression: { status: "Admitted", bed: null } });
admissionSchema.index({ bed: 1 }, { unique: true, partialFilterExpression: { status: "Admitted", bed: { $type: "objectId" } } });
export default mongoose.model("Admission", admissionSchema);
