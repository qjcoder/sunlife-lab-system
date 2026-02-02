import bcrypt from "bcrypt"; // ✅ CHANGE HERE
import User from "../models/User.js";

/**
 * CREATE DEALER ACCOUNT
 *
 * ROLE:
 * FACTORY_ADMIN only
 *
 * POST /api/dealers
 */
export const createDealer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, and password are required",
      });
    }

    // Prevent duplicate users
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create dealer user
    const dealer = await User.create({
      name,
      email,
      passwordHash,
      role: "DEALER",
    });

    return res.status(201).json({
      message: "Dealer account created successfully",
      dealer: {
        id: dealer._id,
        name: dealer.name,
        email: dealer.email,
        role: dealer.role,
      },
    });
  } catch (error) {
    console.error("Create Dealer Error:", error);
    return res.status(500).json({
      message: "Failed to create dealer account",
    });
  }
};