import { Router } from "express";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import Doctor from "../models/Doctor.js";
import Department from "../models/Department.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import { isValidEmail, parseFutureDate } from "../utils/validation.js";

const router = Router();
const hospitalTimeZone = process.env.HOSPITAL_TIME_ZONE || "Asia/Kolkata";
const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function scheduleParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: hospitalTimeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { dayOfWeek: weekdays[values.weekday], time: `${values.hour}:${values.minute}`, hour: Number(values.hour), minute: Number(values.minute) };
}
function createSlotKeys(start, duration) {
  return Array.from({ length: duration }, (_, i) => { const d = new Date(start.getTime() + i * 60000); return [d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,"0"),String(d.getUTCDate()).padStart(2,"0"),String(d.getUTCHours()).padStart(2,"0"),String(d.getUTCMinutes()).padStart(2,"0")].join(""); });
}
function zonedDateTimeToUtc(dateText, timeText) {
  const [y,m,d] = dateText.split("-").map(Number); const [hh,mm] = timeText.split(":").map(Number);
  const desired = Date.UTC(y,m-1,d,hh,mm); let guess = desired;
  for (let i=0;i<3;i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: hospitalTimeZone, year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
    const represented = Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));
    guess += desired - represented;
  }
  return new Date(guess);
}
function validPhone(phone) { const digits = phone.replace(/\D/g, "").length; return digits >= 7 && digits <= 15 && /^\+?[0-9 ()-]+$/.test(phone); }
async function overlaps(doctorId, start, duration) {
  const end = new Date(start.getTime()+duration*60000);
  const rows = await Appointment.find({ doctor:doctorId,status:{$in:["Booked","Confirmed"]},scheduledAt:{$lt:end,$gte:new Date(start.getTime()-180*60000)} }).select("scheduledAt durationMinutes");
  return rows.some(a=>start.getTime()<new Date(a.scheduledAt).getTime()+(a.durationMinutes||30)*60000 && new Date(a.scheduledAt).getTime()<end.getTime());
}
function withinDoctorHours(doctor,date,duration) {
  const {dayOfWeek,hour,minute}=scheduleParts(date);const start=hour*60+minute;const end=start+duration;
  return (doctor.availability||[]).some(slot=>{const open=Number(slot.startTime.slice(0,2))*60+Number(slot.startTime.slice(3));const close=Number(slot.endTime.slice(0,2))*60+Number(slot.endTime.slice(3));return slot.dayOfWeek===dayOfWeek&&start>=open&&end<=close;});
}
router.get("/booking-options", async (_req, res, next) => {
  try { const [departments,doctors]=await Promise.all([Department.find({active:true}).select("name description").sort({name:1}),Doctor.find({active:true}).select("fullName specialization department availability consultationDuration").sort({fullName:1})]);res.json({departments,doctors}); } catch(error){next(error);}
});
router.get("/availability", async (req,res,next)=>{
  try { const {doctor:doctorId,date}=req.query;if(!mongoose.isValidObjectId(doctorId)||!/^\d{4}-\d{2}-\d{2}$/.test(String(date||"")))return res.status(400).json({message:"A valid doctor and date are required"});const doctor=await Doctor.findOne({_id:doctorId,active:true});if(!doctor)return res.status(404).json({message:"Active doctor not found"});const [y,m,d]=String(date).split("-").map(Number);const weekday=new Date(Date.UTC(y,m-1,d)).getUTCDay();const schedule=(doctor.availability||[]).filter(s=>s.dayOfWeek===weekday);const duration=doctor.consultationDuration||30;const slots=[];for(const s of schedule){const [sh,sm]=s.startTime.split(":").map(Number);const [eh,em]=s.endTime.split(":").map(Number);const open=sh*60+sm,close=eh*60+em;for(let mins=open;mins+duration<=close;mins+=duration){const label=`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;const at=zonedDateTimeToUtc(String(date),label);if(at>new Date()&&!await overlaps(doctor._id,at,duration))slots.push({label,scheduledAt:at.toISOString()});}}res.json({durationMinutes:duration,slots});}catch(e){next(e);}
});
router.post("/book-appointment", async (req,res,next)=>{
  try {
    const fullName=typeof req.body.fullName==="string"?req.body.fullName.trim():"";const email=typeof req.body.email==="string"?req.body.email.trim().toLowerCase():"";const phone=typeof req.body.phone==="string"?req.body.phone.trim():"";const reason=typeof req.body.reason==="string"?req.body.reason.trim():"";const doctorId=String(req.body.doctor||"");const scheduledAt=parseFutureDate(req.body.scheduledAt);
    if(!fullName||fullName.length>120)return res.status(400).json({message:"Enter your full name (maximum 120 characters)."});if(!isValidEmail(email))return res.status(400).json({message:"Enter a valid email address."});if(!validPhone(phone))return res.status(400).json({message:"Enter a valid contact number (7–15 digits)."});if(!mongoose.isValidObjectId(doctorId))return res.status(400).json({message:"Choose a valid doctor."});if(!scheduledAt)return res.status(400).json({message:"Choose a valid future date and time."});if(reason.length>500)return res.status(400).json({message:"Reason must be 500 characters or fewer."});
    const doctor=await Doctor.findOne({_id:doctorId,active:true});if(!doctor)return res.status(404).json({message:"That doctor is not available for booking."});const duration=doctor.consultationDuration||30;if(!withinDoctorHours(doctor,scheduledAt,duration))return res.status(400).json({message:"The selected doctor is not available for the full consultation duration."});if(await overlaps(doctor._id,scheduledAt,duration))return res.status(409).json({message:"That time slot overlaps an existing appointment. Please choose another time."});
    let patient=await Patient.findOne({fullName,email,phone,linkedUser:null});if(!patient)patient=await Patient.create({patientId:`PT-${randomBytes(3).toString("hex").toUpperCase()}`,fullName,email,phone});
    const appointment=await Appointment.create({patient:patient._id,doctor:doctor._id,scheduledAt,durationMinutes:duration,slotKeys:createSlotKeys(scheduledAt,duration),reason});const result=await appointment.populate([{path:"patient",select:"fullName phone email"},{path:"doctor",select:"fullName specialization department"}]);res.status(201).json({message:"Your appointment request is confirmed.",appointment:result});
  }catch(error){if(error?.code===11000)return res.status(409).json({message:"That time slot has just been booked. Please choose another time."});next(error);}
});
export default router;
