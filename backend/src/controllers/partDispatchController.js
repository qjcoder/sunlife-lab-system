import PartDispatch from "../models/PartDispatch.js";

/**
 * Utility: Auto-generate dispatch number
 * Format: DISP-YYYY-XXXX
 * Example: DISP-2026-0007
 */
const generateDispatchNumber = async () => {
  const year = new Date().getFullYear();

  const count = await PartDispatch.countDocuments({
    dispatchNumber: new RegExp(`^DISP-${year}-`),
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `DISP-${year}-${sequence}`;
};

/**
 * CREATE PART DISPATCH
 * FACTORY_ADMIN only
 */
export const createPartDispatch = async (req, res) => {
  try {
    const { serviceCenter, dispatchedItems, remarks } = req.body;

    if (!serviceCenter || !dispatchedItems || dispatchedItems.length === 0) {
      return res.status(400).json({
        message: "serviceCenter and dispatchedItems are required",
      });
    }

    const dispatchNumber = await generateDispatchNumber();

    const dispatch = await PartDispatch.create({
      dispatchNumber,
      serviceCenter,
      dispatchedItems,
      dispatchedBy: req.user.userId,
      remarks,
    });

    return res.status(201).json({
      message: "Part dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Create Part Dispatch Error:", error);
    return res.status(500).json({
      message: "Failed to create part dispatch",
    });
  }
};

/**
 * LIST PART DISPATCHES
 * - FACTORY_ADMIN → all dispatches
 * - SERVICE_CENTER → only own dispatches
 */
export const listPartDispatches = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "SERVICE_CENTER") {
      query.serviceCenter = req.user.name;
    }

    const dispatches = await PartDispatch.find(query)
      .sort({ dispatchDate: -1 })
      .populate("dispatchedBy", "name role")
      .lean();

    return res.json({
      count: dispatches.length,
      data: dispatches,
    });
  } catch (error) {
    console.error("List Part Dispatches Error:", error);
    return res.status(500).json({
      message: "Failed to list part dispatches",
    });
  }
};