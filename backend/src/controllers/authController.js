import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Login API
 * FACTORY_ADMIN / SERVICE_CENTER
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2️⃣ Find active user
    const user = await User.findOne({ email, active: true });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 🔍 DEBUG (KEEP TEMPORARILY)
    console.log("LOGIN USER =", user.email);
    console.log("PASSWORD RECEIVED =", password);
    console.log("PASSWORD HASH =", user.passwordHash);

    // 3️⃣ Verify password
    const passwordValid = await user.verifyPassword(password);

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 5️⃣ Success response
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};