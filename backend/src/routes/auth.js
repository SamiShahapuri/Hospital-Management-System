import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Enter a name (up to 100 characters), a valid email, and a password between 8 and 128 characters"
      });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let createdUser;
    await session.withTransaction(async () => {
      [createdUser] = await User.create([{
        name, email, passwordHash, role: "Patient"
      }], { session });
      await Patient.create([{
        fullName: name, email, linkedUser: createdUser._id
      }], { session });
    });
    res.status(201).json({
      id: String(createdUser._id),
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Email is already registered" });
    next(error);
  } finally {
    await session.endSession();
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const secret = process.env.JWT_SECRET || "development-only-secret";
    const token = jwt.sign({ id: String(user._id), name: user.name, role: user.role }, secret, { expiresIn: "4h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
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
