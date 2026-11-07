import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import Patient from "./src/models/Patient.js";
import Doctor from "./src/models/Doctor.js";
import Department from "./src/models/Department.js";
import Appointment from "./src/models/Appointment.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_management_sprint1";

async function upsertUser({ name, email, password, role, username }) {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({
      name,
      email: normalizedEmail,
      username: (username || normalizedEmail.split("@")[0]).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role
    });
  } else {
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    const changed = user.name !== name || user.role !== role || (username && user.username !== username) || !passwordMatches || user.failedLoginAttempts > 0 || Boolean(user.lockUntil);
    if (changed) {
      user.name = name;
      user.role = role;
      if (username) user.username = username.toLowerCase();
      if (!passwordMatches) user.passwordHash = await bcrypt.hash(password, 12);
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }
  }
  return user;
}

async function main() {
  await mongoose.connect(uri);

  const admin = await upsertUser({
    name: "Demo Admin",
    email: process.env.DEMO_ADMIN_EMAIL || "admin@example.com",
    password: process.env.DEMO_ADMIN_PASSWORD || "Admin@123",
    role: "Admin",
    username: "admin01"
  });
  await upsertUser({
    name: "Demo Receptionist",
    email: process.env.DEMO_RECEPTIONIST_EMAIL || "reception@example.com",
    password: process.env.DEMO_RECEPTIONIST_PASSWORD || "Recep@123",
    role: "Receptionist",
    username: "reception01"
  });

  await upsertUser({
    name: "Demo Doctor",
    email: process.env.DEMO_DOCTOR_EMAIL || "doctor@example.com",
    password: process.env.DEMO_DOCTOR_PASSWORD || "Doctor@123",
    role: "Doctor",
    username: "drsmith"
  });

  const departmentSpecs = [
    { name: "Cardiology", description: "Heart rhythm, circulation and cardiovascular care", icon: "heart" },
    { name: "Neurology", description: "Brain, spine and nervous system care", icon: "brain" },
    { name: "Orthopedics", description: "Bone, joint and musculoskeletal care", icon: "bone" },
    { name: "Pediatrics", description: "Medical care for infants, children and adolescents", icon: "child" },
    { name: "Dermatology", description: "Skin, hair and nail health", icon: "skin" },
    { name: "General Medicine", description: "Primary care, diagnosis and adult health", icon: "stethoscope" }
  ];
  const departments = {};
  const activeDepartmentNames = departmentSpecs.map(({ name }) => name);
  // Keep the demo directory focused on the six departments in the project brief.
  await Department.updateMany({ name: { $nin: activeDepartmentNames } }, { $set: { active: false } });
  for (const spec of departmentSpecs) {
    departments[spec.name] = await Department.findOneAndUpdate(
      { name: spec.name },
      { $set: { ...spec, active: true } },
      { new: true, upsert: true, runValidators: true }
    );
  }

  const week = (startTime = "09:00", endTime = "17:00") =>
    [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime, endTime }));
  const doctorSpecs = [
    { fullName: "Dr. Ananya Rao", specialization: "Cardiology", department: "Cardiology", email: process.env.DEMO_DOCTOR_EMAIL || "doctor@example.com", username: "drsmith", availability: week() },
    { fullName: "Dr. Kiran Shetty", specialization: "Neurology", department: "Neurology", email: "kiran.shetty@citycare.demo", username: "kiran.shetty", availability: week("10:00", "18:00") },
    { fullName: "Dr. Meera Nair", specialization: "Orthopedics", department: "Orthopedics", email: "meera.nair@citycare.demo", username: "meera.nair", availability: week("10:00", "16:00") },
    { fullName: "Dr. Rahul Menon", specialization: "Pediatrics", department: "Pediatrics", email: "rahul.menon@citycare.demo", username: "rahul.menon", availability: week() },
    { fullName: "Dr. Asha Kulkarni", specialization: "Dermatology", department: "Dermatology", email: "asha.kulkarni@citycare.demo", username: "asha.kulkarni", availability: week("09:30", "16:30") },
    { fullName: "Dr. Vivek Rao", specialization: "General Medicine", department: "General Medicine", email: "vivek.rao@citycare.demo", username: "vivek.rao", availability: week() }
  ];
  // Avoid leaving old demo doctors attached to departments no longer in the six-department demo directory.
  await Doctor.updateMany({ department: { $nin: activeDepartmentNames } }, { $set: { active: false } });
  const doctors = [];
  for (const spec of doctorSpecs) {
    const account = await upsertUser({ name: spec.fullName, email: spec.email, username: spec.username, password: process.env.DEMO_DOCTOR_PASSWORD || "Doctor@123", role: "Doctor" });
    const doctor = await Doctor.findOneAndUpdate(
      { fullName: spec.fullName },
      { $set: { ...spec, linkedUser: account._id, active: true, consultationDuration: 30 } },
      { new: true, upsert: true, runValidators: true }
    );
    doctors.push(doctor);
  }

  const patientSpecs = [
    { fullName: "Aarav Kumar", phone: "9000000001", email: process.env.DEMO_PATIENT_EMAIL || "aarav.demo@example.com", address: "Demo address 1" },
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
    if (!patient.patientId) {
      patient.patientId = `PT-${String(patient._id).slice(-8).toUpperCase()}`;
      await patient.save();
    }
    patients.push(patient);
  }

  // Keep one existing hospital record activated for the submitted UT_M1_06
  // credentials. Other seeded patient records still exercise first-time activation.
  const patientPassword = process.env.DEMO_PATIENT_PASSWORD || "Pat@1234";
  const patientAccount = await upsertUser({
    name: patients[0].fullName,
    email: patients[0].email,
    password: patientPassword,
    role: "Patient",
    username: "patient01"
  });
  if (String(patients[0].linkedUser || "") !== String(patientAccount._id)) {
    patients[0].linkedUser = patientAccount._id;
    await patients[0].save();
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
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "Admin@123";
  const receptionistPassword = process.env.DEMO_RECEPTIONIST_PASSWORD || "Recep@123";
  const doctorPassword = process.env.DEMO_DOCTOR_PASSWORD || "Doctor@123";
  console.log(`Admin: admin01 or ${process.env.DEMO_ADMIN_EMAIL || "admin@example.com"} / ${adminPassword}`);
  console.log(`Receptionist: reception01 or ${process.env.DEMO_RECEPTIONIST_EMAIL || "reception@example.com"} / ${receptionistPassword}`);
  console.log(`Doctor 1: drsmith or ${process.env.DEMO_DOCTOR_EMAIL || "doctor@example.com"} / ${doctorPassword} (Dr. Ananya Rao)`);
  console.log(`Doctor 2: kiran.shetty or kiran.shetty@citycare.demo / ${doctorPassword} (Dr. Kiran Shetty)`);
  console.log(`Doctor 3: meera.nair or meera.nair@citycare.demo / ${doctorPassword} (Dr. Meera Nair)`);
  console.log(`Doctor 4: rahul.menon or rahul.menon@citycare.demo / ${doctorPassword} (Dr. Rahul Menon)`);
  console.log(`Doctor 5: asha.kulkarni or asha.kulkarni@citycare.demo / ${doctorPassword} (Dr. Asha Kulkarni)`);
  console.log(`Doctor 6: vivek.rao or vivek.rao@citycare.demo / ${doctorPassword} (Dr. Vivek Rao)`);
  console.log(`Patient: patient01 or ${patients[0].email} / ${patientPassword} (${patients[0].fullName}, ${patients[0].patientId})`);
  console.log("The other seeded patient records are not activated until the patient uses their Patient ID and registered email.");
  patients.forEach(patient => console.log(`Patient record: ${patient.patientId} · ${patient.fullName} · ${patient.email}`));
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
