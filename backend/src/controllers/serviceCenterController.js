import User from "../models/User.js";

/**
 * CREATE SERVICE CENTER USER
 *
 * Factory Admin creates login for a service center
 *
 * POST /api/service-centers
 *
 * BODY:
 * {
 *   "name": "Lahore Service Center",
 *   "email": "lahore@sunlife.com",
 *   "password": "service123"
 * }
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const createServiceCenter = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1️⃣ Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, and password are required",
      });
    }

    // 2️⃣ Prevent duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    // 3️⃣ Create service center user
    const user = new User({
      name,
      email,
      role: "SERVICE_CENTER",
      active: true,
    });

    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      message: "Service center created successfully",
      serviceCenter: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create Service Center Error:", error);
    return res.status(500).json({
      message: "Failed to create service center",
    });
  }
};