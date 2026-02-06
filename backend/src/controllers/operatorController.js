import User from "../models/User.js";

/**
 * ====================================================
 * OPERATOR CONTROLLER
 * ====================================================
 * 
 * This controller handles data entry operator operations.
 * 
 * PURPOSE:
 * - Factory Admin creates login for data entry operators
 * - Factory Admin can view all operators
 * 
 * ROLES:
 * - FACTORY_ADMIN: Can create and list operators
 */

/**
 * CREATE DATA ENTRY OPERATOR USER
 *
 * Factory Admin creates login for a data entry operator
 *
 * POST /api/operators
 *
 * BODY:
 * {
 *   "name": "John Operator",
 *   "email": "john@sunlife.com",
 *   "password": "operator123"
 * }
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const createOperator = async (req, res) => {
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

    // 3️⃣ Create operator user
    const user = new User({
      name,
      email,
      role: "DATA_ENTRY_OPERATOR",
      active: true,
    });

    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      message: "Data entry operator created successfully",
      operator: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create Operator Error:", error);
    return res.status(500).json({
      message: "Failed to create data entry operator",
    });
  }
};

/**
 * ====================================================
 * LIST ALL DATA ENTRY OPERATORS
 * ====================================================
 * 
 * GET /api/operators
 * Returns all data entry operators with creation date
 */
export const listOperators = async (req, res) => {
  try {
    const operators = await User.find({
      role: "DATA_ENTRY_OPERATOR",
    })
      .select("name email role active createdAt")
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      message: "Data entry operators retrieved successfully",
      operators: operators.map((op) => ({
        id: op._id,
        name: op.name,
        email: op.email,
        role: op.role,
        active: op.active,
        createdAt: op.createdAt,
      })),
    });
  } catch (error) {
    console.error("List Operators Error:", error);
    return res.status(500).json({
      message: "Failed to retrieve data entry operators",
    });
  }
};

/**
 * ====================================================
 * DELETE DATA ENTRY OPERATOR
 * ====================================================
 * 
 * DELETE /api/operators/:id
 * Deletes a data entry operator account (FACTORY_ADMIN only)
 */
export const deleteOperator = async (req, res) => {
  try {
    const { id } = req.params;

    const operator = await User.findById(id);
    if (!operator) {
      return res.status(404).json({
        message: "Operator not found",
      });
    }

    if (operator.role !== "DATA_ENTRY_OPERATOR") {
      return res.status(400).json({
        message: "User is not a data entry operator",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Data entry operator deleted successfully",
    });
  } catch (error) {
    console.error("Delete Operator Error:", error);
    return res.status(500).json({
      message: "Failed to delete operator",
    });
  }
};
