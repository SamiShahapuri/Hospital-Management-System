import mongoose from "mongoose";

const billItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 200 },
  quantity: { type: Number, required: true, min: 1, max: 1000 },
  unitPrice: { type: Number, required: true, min: 0, max: 1000000 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const billSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  items: { type: [billItemSchema], validate: [(items) => items.length > 0 && items.length <= 20, "A bill must contain between 1 and 20 items"] },
  subtotal: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Unpaid", "Paid", "Cancelled"], default: "Unpaid", index: true },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  issuedAt: { type: Date, default: Date.now },
  paidAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

billSchema.index({ status: 1, issuedAt: -1 });
export default mongoose.model("Bill", billSchema);
