import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Check user role from email (without password)
 * Used to auto-select role on login page
 */
export const checkRole = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email address",
      });
    }

    // Return role without sensitive information
    return res.json({
      role: user.role,
      active: user.active,
    });
  } catch (error) {
    console.error("Check role error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

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

    // 2️⃣ Find user (check both active and inactive to provide better error messages)
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "No account found with this email address. Please check your email and try again.",
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        message: "Your account is inactive. Please contact your administrator to activate your account.",
      });
    }

    // 🔍 DEBUG (KEEP TEMPORARILY)
    // console.log("LOGIN USER =", user.email);
    // console.log("PASSWORD RECEIVED =", password);
    // console.log("PASSWORD HASH =", user.passwordHash);

    // 3️⃣ Verify password
    const passwordValid = await user.verifyPassword(password);

    if (!passwordValid) {
      return res.status(401).json({
        message: "The password you entered is incorrect. Please check your password and try again.",
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