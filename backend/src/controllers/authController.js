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
 * Admin: login with email (Gmail, Outlook, etc.)
 * Other roles: login with username and password
 */
export const login = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const loginId = email || username;

    // 1️⃣ Validate input
    if (!loginId || !password) {
      return res.status(400).json({
        message: "Email/username and password are required",
      });
    }

    // 2️⃣ Find user by email or username
    const isEmail = loginId.includes("@");
    const user = await User.findOne(
      isEmail ? { email: loginId } : { username: loginId }
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password. Please try again.",
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
        message: "Invalid email or password. Please try again.",
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

    // 5️⃣ Success response (isSuperAdmin = script-created admin with email; only they can delete other admins)
    const isSuperAdmin = user.role === "FACTORY_ADMIN" && !!user.email && user.email.includes("@");
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isSuperAdmin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Create another Factory Admin from panel (FACTORY_ADMIN only).
 * Same as other roles: name, username, password. Super admin is created only via script (email).
 * POST /api/auth/create-admin
 * Body: { name, username, password }
 */
export const createAdmin = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "Name, username and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({
        message: "An account with this username already exists",
      });
    }

    const user = new User({
      name: name.trim(),
      username: username.trim(),
      role: "FACTORY_ADMIN",
      active: true,
    });
    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      message: "Factory Admin created successfully",
      admin: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * List all Factory Admins (FACTORY_ADMIN only).
 * Includes super admin (script, has email) and panel admins (username).
 * GET /api/auth/admins
 */
export const listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "FACTORY_ADMIN" })
      .select("_id name email username role active createdAt")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      message: "OK",
      admins,
    });
  } catch (error) {
    console.error("List admins error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Delete a Factory Admin (Super Admin only; middleware enforces). Cannot delete self.
 * DELETE /api/auth/admins/:id
 */
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const callerId = req.user?.userId;

    if (!callerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (callerId.toString() === id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }
    if (user.role !== "FACTORY_ADMIN") {
      return res.status(400).json({
        message: "User is not an admin",
      });
    }

    await User.findByIdAndDelete(id);

    return res.json({
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Reset password for any account (FACTORY_ADMIN only)
 * POST /api/auth/reset-password
 * Body: { userId, newPassword }
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        message: "userId and newPassword are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await user.setPassword(newPassword);
    await user.save();

    return res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};