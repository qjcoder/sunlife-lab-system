import User from "../models/User.js";

/**
 * ====================================================
 * INSTALLER PROGRAM MANAGER CONTROLLER
 * ====================================================
 *
 * Factory Admin creates and manages installer program manager accounts.
 * Same pattern as data entry operators.
 */

export const createInstallerProgramManager = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const user = new User({
      name,
      email,
      role: "INSTALLER_PROGRAM_MANAGER",
      active: true,
    });

    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      message: "Installer program manager created successfully",
      installerProgramManager: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create Installer Program Manager Error:", error);
    return res.status(500).json({
      message: "Failed to create installer program manager",
    });
  }
};

export const listInstallerProgramManagers = async (req, res) => {
  try {
    const users = await User.find({ role: "INSTALLER_PROGRAM_MANAGER" })
      .select("name email role active createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Installer program managers retrieved successfully",
      installerProgramManagers: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("List Installer Program Managers Error:", error);
    return res.status(500).json({
      message: "Failed to retrieve installer program managers",
    });
  }
};

export const deleteInstallerProgramManager = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "Installer program manager not found",
      });
    }

    if (user.role !== "INSTALLER_PROGRAM_MANAGER") {
      return res.status(400).json({
        message: "User is not an installer program manager",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Installer program manager deleted successfully",
    });
  } catch (error) {
    console.error("Delete Installer Program Manager Error:", error);
    return res.status(500).json({
      message: "Failed to delete installer program manager",
    });
  }
};
