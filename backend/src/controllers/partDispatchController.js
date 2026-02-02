import PartDispatch from "../models/PartDispatch.js";
import ServiceCenterStock from "../models/ServiceCenterStock.js";

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
 *
 * FLOW:
 * Factory → Service Center
 *
 * IMPORTANT DESIGN RULES:
 * - Dispatch is IMMUTABLE (audit record)
 * - Stock ONLY increases here
 * - ServiceCenterStock is a cached view (not authority)
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const createPartDispatch = async (req, res) => {
  try {
    const { serviceCenter, dispatchedItems, remarks } = req.body;

    /* --------------------------------------------------
     * STEP 1: Basic validation
     * ------------------------------------------------ */
    if (
      !serviceCenter ||
      !Array.isArray(dispatchedItems) ||
      dispatchedItems.length === 0
    ) {
      return res.status(400).json({
        message: "serviceCenter and dispatchedItems are required",
      });
    }

    /* --------------------------------------------------
     * STEP 2: Validate dispatched items
     * ------------------------------------------------ */
    for (const item of dispatchedItems) {
      if (
        !item.partCode ||
        !item.partName ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Each dispatched item must include partCode, partName, and quantity > 0",
        });
      }
    }

    /* --------------------------------------------------
     * STEP 3: Generate dispatch number
     * ------------------------------------------------ */
    const dispatchNumber = await generateDispatchNumber();

    /* --------------------------------------------------
     * STEP 4: Create dispatch (AUDIT RECORD)
     * ------------------------------------------------ */
    const dispatch = await PartDispatch.create({
      dispatchNumber,
      serviceCenter,
      dispatchedItems,
      dispatchedBy: req.user.userId,
      remarks,
    });

    /* --------------------------------------------------
     * STEP 5: Credit stock to service center
     * THIS IS THE ONLY PLACE STOCK INCREASES
     * ------------------------------------------------ */
    for (const item of dispatchedItems) {
      await ServiceCenterStock.findOneAndUpdate(
        {
          serviceCenter,
          partCode: item.partCode,
        },
        {
          $inc: { quantity: item.quantity },
          $set: {
            partName: item.partName,
            lastDispatch: dispatch._id,
          },
        },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({
      message: "Part dispatch created and stock updated successfully",
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
 *
 * ACCESS RULES:
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