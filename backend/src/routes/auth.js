import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res, next) => {
  let user;
  try {
    const patientId = typeof req.body.patientId === "string" ? req.body.patientId.trim().toUpperCase() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const requestedUsername = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const username = requestedUsername || `patient-${patientId.replace(/^PT-?/i, "").toLowerCase()}`;

    if (!patientId || !name || name.length > 120 || !emailPattern.test(email) || email.length > 254 ||
        !/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Enter your existing Patient ID, full name, registered email, and a password between 8 and 128 characters."
      });
    }

    // A patient account can only be activated against a record created by hospital staff.
    const patientMatch = {
      patientId,
      fullName: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      email
    };
    const existingPatient = await Patient.findOne(patientMatch);
    if (!existingPatient) {
      return res.status(404).json({ message: "No matching hospital record was found. Please ask Reception to register you first and verify your Patient ID and registered email." });
    }
    if (existingPatient.linkedUser) {
      return res.status(409).json({ message: "An account has already been activated for this patient record. Please sign in or contact Reception." });
    }
    if (await User.exists({ $or: [{ email }, { username }] })) {
      return res.status(409).json({ message: "Email or username is already registered to another account" });
    }

    user = await User.create({ name: existingPatient.fullName, email, username, passwordHash: await bcrypt.hash(password, 12), role: "Patient" });
    // Atomically claim the record so two activation requests cannot link two accounts to one patient.
    const patient = await Patient.findOneAndUpdate(
      { _id: existingPatient._id, ...patientMatch, $or: [{ linkedUser: null }, { linkedUser: { $exists: false } }] },
      { $set: { linkedUser: user._id } },
      { new: true }
    );
    if (!patient) {
      await User.deleteOne({ _id: user._id });
      user = null;
      return res.status(409).json({ message: "This patient record has already been linked to an account. Please sign in or contact Reception." });
    }

    res.status(201).json({
      id: String(user._id), name: user.name, email: user.email, username: user.username, role: user.role,
      patientId: patient.patientId, message: "Patient account activated. You can now sign in."
    });
  } catch (error) {
    if (user?._id) {
      try { await User.deleteOne({ _id: user._id }); } catch (cleanupError) {
        console.error("Could not roll back incomplete patient account activation:", cleanupError.message);
      }
    }
    if (error?.code === 11000) return res.status(409).json({ message: "This email or patient account is already registered." });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const identifier = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() :
      typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() :
      typeof req.body.login === "string" ? req.body.login.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!identifier || !password) return res.status(400).json({ message: "Username/email and password are required" });

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({ message: "Account locked after repeated failed attempts. Please try again after 15 minutes or contact the administrator." });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        return res.status(423).json({ message: "Account locked after 5 incorrect attempts. Try again after 15 minutes." });
      }
      await user.save();
      return res.status(401).json({ message: "Invalid email or password" });
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    const secret = process.env.JWT_SECRET || "development-only-secret";
    const token = jwt.sign(
      { id: String(user._id), name: user.name, role: user.role, tokenVersion: user.tokenVersion || 0 },
      secret,
      { expiresIn: "4h" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Signed out successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
