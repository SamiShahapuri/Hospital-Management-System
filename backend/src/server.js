import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import admissionRoutes from "./routes/admissions.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "hms-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admissions", admissionRoutes);
app.use((req, res) => res.status(404).json({ message: "Route not found: " + req.method + " " + req.path }));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  const status = err.status || (err.name === "ValidationError" ? 400 : 500);
  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message });
});
const port = Number(process.env.PORT || 5000);
try {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_management_sprint1");
  app.listen(port, () => console.log("HMS API listening on http://localhost:" + port));
} catch (error) {
  console.error("Could not connect to MongoDB. Check MONGODB_URI.", error.message);
  process.exit(1);
}
