import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import Patient from "./src/models/Patient.js";
import Doctor from "./src/models/Doctor.js";
import Department from "./src/models/Department.js";
import Appointment from "./src/models/Appointment.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_management_sprint1";

async function upsertUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role
    });
  }
  return user;
}

async function main() {
  await mongoose.connect(uri);

  const admin = await upsertUser({
    name: "Demo Admin",
    email: process.env.DEMO_ADMIN_EMAIL || "admin@example.com",
    password: process.env.DEMO_ADMIN_PASSWORD || "AdminDemo123!",
    role: "Admin"
  });
  await upsertUser({
    name: "Demo Receptionist",
    email: process.env.DEMO_RECEPTIONIST_EMAIL || "reception@example.com",
    password: process.env.DEMO_RECEPTIONIST_PASSWORD || "ReceptionDemo123!",
    role: "Receptionist"
  });

  await upsertUser({
    name: "Demo Doctor",
    email: process.env.DEMO_DOCTOR_EMAIL || "doctor@example.com",
    password: process.env.DEMO_DOCTOR_PASSWORD || "DoctorDemo123!",
    role: "Doctor"
  });

  const departmentSpecs = [
    { name: "Cardiology", description: "Heart and cardiovascular care" },
    { name: "General Medicine", description: "Primary and general medical care" },
    { name: "Orthopedics", description: "Bone, joint and musculoskeletal care" }
  ];
  const departments = {};
  for (const spec of departmentSpecs) {
    departments[spec.name] = await Department.findOneAndUpdate(
      { name: spec.name },
      { $setOnInsert: spec },
      { new: true, upsert: true, runValidators: true }
    );
  }

  const doctorSpecs = [
    { fullName: "Dr. Ananya Rao", specialization: "Cardiology", department: "Cardiology", availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }] },
    { fullName: "Dr. Kiran Shetty", specialization: "General Medicine", department: "General Medicine", availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }] },
    { fullName: "Dr. Meera Nair", specialization: "Orthopedics", department: "Orthopedics", availability: [{ dayOfWeek: 1, startTime: "10:00", endTime: "16:00" }, { dayOfWeek: 2, startTime: "10:00", endTime: "16:00" }, { dayOfWeek: 3, startTime: "10:00", endTime: "16:00" }, { dayOfWeek: 4, startTime: "10:00", endTime: "16:00" }, { dayOfWeek: 5, startTime: "10:00", endTime: "16:00" }] }
  ];
  const doctors = [];
  for (const spec of doctorSpecs) {
    const doctor = await Doctor.findOneAndUpdate(
      { fullName: spec.fullName },
      { $setOnInsert: spec },
      { new: true, upsert: true, runValidators: true }
    );
    doctors.push(doctor);
  }

  const patientSpecs = [
    { fullName: "Aarav Kumar", phone: "9000000001", email: "aarav.demo@example.com", address: "Demo address 1" },
    { fullName: "Diya Sharma", phone: "9000000002", email: "diya.demo@example.com", address: "Demo address 2" },
    { fullName: "Rohan Patel", phone: "9000000003", email: "rohan.demo@example.com", address: "Demo address 3" }
  ];
  const patients = [];
  for (const spec of patientSpecs) {
    const patient = await Patient.findOneAndUpdate(
      { email: spec.email },
      { $setOnInsert: { ...spec, createdBy: admin._id } },
      { new: true, upsert: true, runValidators: true }
    );
    patients.push(patient);
  }

  const existingDemoAppointment = await Appointment.findOne({ reason: "Seeded demonstration appointment" });
  if (!existingDemoAppointment) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);
    await Appointment.create({
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      scheduledAt,
      reason: "Seeded demonstration appointment",
      createdBy: admin._id
    });
  }

  console.log("Demo data is ready.");
  console.log("Admin: admin@example.com / AdminDemo123!");
  console.log("Receptionist: reception@example.com / ReceptionDemo123!");
  console.log("Doctor: doctor@example.com / DoctorDemo123!");
  console.log("Use these credentials only in a local demo environment. Change them before any deployment.");
}

main()
  .catch((error) => {
    console.error("Could not seed demo data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
