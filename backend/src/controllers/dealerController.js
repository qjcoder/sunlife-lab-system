import bcrypt from "bcrypt";
import User from "../models/User.js";

/**
 * ====================================================
 * DEALER CONTROLLER
 * ====================================================
 * 
 * This controller handles dealer and sub-dealer operations.
 * 
 * WORKFLOW:
 * 1. Factory Admin creates main dealers
 * 2. Main dealers create sub-dealers under their account
 * 3. Dealers can manage their hierarchy
 * 
 * BUSINESS RULES:
 * - Main dealers have parentDealer = null
 * - Sub-dealers must belong to a main dealer
 * - Each dealer has unique email
 * 
 * ROLES:
 * - FACTORY_ADMIN: Can create main dealers and view hierarchy
 * - DEALER: Can create sub-dealers under their account
 */
export const createDealer = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "name, username, and password are required",
      });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({
        message: "User with this username already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const dealer = await User.create({
      name,
      username,
      passwordHash,
      role: "DEALER",
      parentDealer: null, // ✅ main dealer
      active: true,
    });

    return res.status(201).json({
      message: "Dealer account created successfully",
      dealer: {
        id: dealer._id,
        name: dealer.name,
        username: dealer.username,
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

/**
 * ====================================================
 * CREATE SUB-DEALER (Dealer → Sub-Dealer)
 * ====================================================
 *
 * RULES:
 * - Only MAIN dealer can create sub-dealer
 * - Sub-dealers cannot create further sub-dealers
 * - Role is SUB_DEALER
 *
 * POST /api/dealers/sub-dealer
 */
export const createSubDealer = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    // Must be dealer
    if (req.user.role !== "DEALER") {
      return res.status(403).json({
        message: "Only dealers can create sub-dealers",
      });
    }

    // Prevent nesting
    if (req.user.parentDealer) {
      return res.status(403).json({
        message: "Sub-dealers cannot create further sub-dealers",
      });
    }

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "name, username, and password are required",
      });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({
        message: "User with this username already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const subDealer = await User.create({
      name,
      username,
      passwordHash,
      role: "SUB_DEALER",
      parentDealer: req.user.userId, // ✅ ObjectId link
      active: true,
    });

    return res.status(201).json({
      message: "Sub-dealer created successfully",
      subDealer: {
        id: subDealer._id,
        name: subDealer.name,
        username: subDealer.username,
        role: subDealer.role,
        parentDealer: subDealer.parentDealer,
      },
    });
  } catch (error) {
    console.error("Create Sub-Dealer Error:", error);
    return res.status(500).json({
      message: "Failed to create sub-dealer",
    });
  }
};

/**
 * ====================================================
 * LIST ALL DEALERS (Main Dealers Only)
 * ====================================================
 * 
 * GET /api/dealers
 * Returns all main dealers (parentDealer = null) with creation date
 */
export const listDealers = async (req, res) => {
  try {
    const dealers = await User.find({
      role: "DEALER",
      parentDealer: null, // Only main dealers
    })
      .select("name email username role active createdAt")
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      message: "Dealers retrieved successfully",
      dealers: dealers.map((dealer) => ({
        id: dealer._id,
        name: dealer.name,
        username: dealer.username,
        email: dealer.email,
        role: dealer.role,
        active: dealer.active,
        createdAt: dealer.createdAt,
      })),
    });
  } catch (error) {
    console.error("List Dealers Error:", error);
    return res.status(500).json({
      message: "Failed to retrieve dealers",
    });
  }
};

/**
 * ====================================================
 * DELETE DEALER
 * ====================================================
 * 
 * DELETE /api/dealers/:id
 * Deletes a dealer account (FACTORY_ADMIN only)
 * 
 * Note: This will also delete all sub-dealers under this dealer
 */
export const deleteDealer = async (req, res) => {
  try {
    const { id } = req.params;

    const dealer = await User.findById(id);
    if (!dealer) {
      return res.status(404).json({
        message: "Dealer not found",
      });
    }

    if (dealer.role !== "DEALER") {
      return res.status(400).json({
        message: "User is not a dealer",
      });
    }

    // Delete all sub-dealers under this dealer
    await User.deleteMany({ parentDealer: id });

    // Delete the dealer
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Dealer and all sub-dealers deleted successfully",
    });
  } catch (error) {
    console.error("Delete Dealer Error:", error);
    return res.status(500).json({
      message: "Failed to delete dealer",
    });
  }
};