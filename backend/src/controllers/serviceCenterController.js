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

/**
 * ====================================================
 * LIST ALL SERVICE CENTERS
 * ====================================================
 * 
 * GET /api/service-centers
 * Returns all service centers with creation date
 */
export const listServiceCenters = async (req, res) => {
  try {
    const serviceCenters = await User.find({
      role: "SERVICE_CENTER",
    })
      .select("name email role active createdAt")
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      message: "Service centers retrieved successfully",
      serviceCenters: serviceCenters.map((sc) => ({
        id: sc._id,
        name: sc.name,
        email: sc.email,
        role: sc.role,
        active: sc.active,
        createdAt: sc.createdAt,
      })),
    });
  } catch (error) {
    console.error("List Service Centers Error:", error);
    return res.status(500).json({
      message: "Failed to retrieve service centers",
    });
  }
};

/**
 * ====================================================
 * DELETE SERVICE CENTER
 * ====================================================
 * 
 * DELETE /api/service-centers/:id
 * Deletes a service center account (FACTORY_ADMIN only)
 */
export const deleteServiceCenter = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceCenter = await User.findById(id);
    if (!serviceCenter) {
      return res.status(404).json({
        message: "Service center not found",
      });
    }

    if (serviceCenter.role !== "SERVICE_CENTER") {
      return res.status(400).json({
        message: "User is not a service center",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Service center deleted successfully",
    });
  } catch (error) {
    console.error("Delete Service Center Error:", error);
    return res.status(500).json({
      message: "Failed to delete service center",
    });
  }
};