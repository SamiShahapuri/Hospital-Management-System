import { Router } from "express";
import mongoose from "mongoose";
import Admission from "../models/Admission.js";
import Patient from "../models/Patient.js";
import Bed from "../models/Bed.js";
import Room from "../models/Room.js";
import Bill from "../models/Bill.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
const router = Router();
router.use(authenticate);
router.get("/", allowRoles("Admin", "Doctor", "Receptionist"), async (req,res,next)=>{try{const filter={};if(req.query.status){if(!["Admitted","Discharged"].includes(String(req.query.status)))return res.status(400).json({message:"Invalid admission status"});filter.status=String(req.query.status);}if(req.user.role==="Doctor"){const {default:Doctor}=await import("../models/Doctor.js");const doc=await Doctor.findOne({linkedUser:req.user.id,active:true});if(!doc)return res.json([]);const {default:Appointment}=await import("../models/Appointment.js");const pids=await Appointment.distinct("patient",{doctor:doc._id});filter.patient={$in:pids};}const rows=await Admission.find(filter).populate("patient","fullName phone email patientId").populate("admittedBy","name").populate({path:"bed",populate:{path:"room",populate:{path:"ward",populate:{path:"department",select:"name"}}}}).populate({path:"transferHistory.fromBed",populate:{path:"room",populate:{path:"ward",select:"name"}}}).populate({path:"transferHistory.toBed",populate:{path:"room",populate:{path:"ward",select:"name"}}}).sort({admittedAt:-1}).limit(200);res.json(rows);}catch(e){next(e);}});
router.post("/", allowRoles("Admin","Doctor","Receptionist"), async(req,res,next)=>{let allocated=null;try{const {patient,bed}=req.body;if(!mongoose.isValidObjectId(patient))return res.status(400).json({message:"A valid patient ID is required"});if(!(await Patient.exists({_id:patient})))return res.status(404).json({message:"Patient not found"});if(await Admission.exists({patient,status:"Admitted"}))return res.status(409).json({message:"This patient already has an active admission"});let roomNumber="",bedNumber="",bedId=null;if(bed){if(!mongoose.isValidObjectId(bed))return res.status(400).json({message:"Invalid bed ID"});allocated=await Bed.findOneAndUpdate({_id:bed,status:{$in:["Available","Reserved"]}},{$set:{status:"Occupied"}},{new:true});if(!allocated)return res.status(409).json({message:"This bed is no longer available"});bedId=allocated._id;bedNumber=allocated.bedNumber;const room=await Room.findOne({_id:allocated.room,active:true}).populate("ward");if(!room||!room.ward?.active)throw new Error("The selected bed belongs to an inactive room or ward");roomNumber=room.roomNumber;}else{roomNumber=String(req.body.roomNumber||"").trim();bedNumber=String(req.body.bedNumber||"").trim();if(!roomNumber||!bedNumber)return res.status(400).json({message:"Choose a tracked bed or enter both room and bed numbers"});if(await Admission.exists({roomNumber,bedNumber,status:"Admitted",bed:null}))return res.status(409).json({message:"This bed is already occupied"});}
const admission=await Admission.create({patient,bed:bedId,roomNumber,bedNumber,admittedBy:req.user.id});await admission.populate(["patient","bed"]);res.status(201).json(admission);}catch(e){if(allocated)await Bed.updateOne({_id:allocated._id,status:"Occupied"},{$set:{status:"Available"}}).catch(()=>{});if(e.code===11000)return res.status(409).json({message:"This bed is already occupied"});next(e);}});
router.post("/:id/treatments", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid admission ID" });
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";
    if (!description) return res.status(400).json({ message: "Treatment or procedure name is required" });
    if (description.length > 300 || details.length > 1000) return res.status(400).json({ message: "Treatment details are too long" });
    const admission = await Admission.findOneAndUpdate(
      { _id: req.params.id, status: "Admitted" },
      { $push: { treatments: { description, details, recordedBy: req.user.id, recordedAt: new Date() } } },
      { new: true, runValidators: true }
    ).populate("patient", "fullName phone email");
    if (!admission) return res.status(404).json({ message: "Active admission not found" });
    res.status(201).json(admission);
  } catch (error) { next(error); }
});

router.patch("/:id/discharge", allowRoles("Admin", "Doctor", "Receptionist"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid admission ID" });
    const dischargeSummary = typeof req.body.dischargeSummary === "string" ? req.body.dischargeSummary.trim() : "";
    if (!dischargeSummary) return res.status(400).json({ message: "Discharge summary is required before discharge" });
    if (dischargeSummary.length > 2000) return res.status(400).json({ message: "Discharge summary must be 2,000 characters or fewer" });

    const admission = await Admission.findOne({ _id: req.params.id, status: "Admitted" });
    if (!admission) return res.status(404).json({ message: "Active admission not found" });

    let roomCharge = null;
    if (admission.bed) {
      const trackedBed = await Bed.findById(admission.bed).populate({ path: "room", select: "roomNumber dailyRate" });
      const room = trackedBed?.room;
      if (room) {
        const stayDays = Math.max(1, Math.ceil((Date.now() - new Date(admission.admittedAt).getTime()) / 86400000));
        const dailyRate = Number(room.dailyRate ?? 1200);
        const subtotal = Math.round(stayDays * dailyRate * 100) / 100;
        roomCharge = await Bill.findOneAndUpdate(
          { sourceAdmission: admission._id },
          { $setOnInsert: {
            sourceAdmission: admission._id,
            patient: admission.patient,
            items: [{ description: `Room charges · ${room.roomNumber} · ${stayDays} day(s)`, quantity: stayDays, unitPrice: dailyRate, lineTotal: subtotal }],
            subtotal, amountPaid: 0, balanceDue: subtotal, status: "Unpaid", notes: "Automatically generated on patient discharge", createdBy: admission.admittedBy
          } },
          { new: true, upsert: true, runValidators: true }
        );
      }
    }

    admission.status = "Discharged";
    admission.dischargedAt = new Date();
    admission.dischargeSummary = dischargeSummary;
    if (roomCharge) admission.roomChargeBill = roomCharge._id;
    await admission.save();
    if (admission.bed) await Bed.updateOne({ _id: admission.bed, status: "Occupied" }, { $set: { status: "Available" } });
    await admission.populate(["patient", "bed", "roomChargeBill"]);
    res.json(admission);
  } catch (error) { next(error); }
});

router.patch("/:id/transfer",allowRoles("Admin","Doctor","Receptionist"),async(req,res,next)=>{let reserved=null;try{if(!mongoose.isValidObjectId(req.params.id)||!mongoose.isValidObjectId(req.body.bed))return res.status(400).json({message:"Valid admission and destination bed IDs are required"});const admission=await Admission.findOne({_id:req.params.id,status:"Admitted"});if(!admission)return res.status(404).json({message:"Active admission not found"});if(String(admission.bed||"")===String(req.body.bed))return res.status(400).json({message:"Patient is already assigned to that bed"});reserved=await Bed.findOneAndUpdate({_id:req.body.bed,status:{$in:["Available","Reserved"]}},{$set:{status:"Occupied"}},{new:true});if(!reserved)return res.status(409).json({message:"Destination bed is not available"});const room=await Room.findOne({_id:reserved.room,active:true}).populate("ward");if(!room||!room.ward?.active)throw new Error("Destination room or ward is inactive");const oldBed=admission.bed;admission.transferHistory.push({fromBed:oldBed||undefined,toBed:reserved._id,transferredAt:new Date(),transferredBy:req.user.id});admission.bed=reserved._id;admission.roomNumber=room.roomNumber;admission.bedNumber=reserved.bedNumber;await admission.save();if(oldBed)await Bed.updateOne({_id:oldBed,status:"Occupied"},{$set:{status:"Available"}});await admission.populate(["patient","bed"]);res.json(admission);}catch(e){if(reserved)await Bed.updateOne({_id:reserved._id,status:"Occupied"},{$set:{status:"Available"}}).catch(()=>{});if(e.code===11000)return res.status(409).json({message:"Destination bed is already assigned"});next(e);}});
export default router;
