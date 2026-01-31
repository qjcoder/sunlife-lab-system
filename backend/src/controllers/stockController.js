import PartDispatch from "../models/PartDispatch.js";
import ReplacedPart from "../models/ReplacedPart.js";

/**
 * Get service center stock balance
 *
 * Shows:
 * - Total dispatched quantity per part
 * - Total consumed quantity
 * - Remaining available stock
 */
export const getServiceCenterStock = async (req, res) => {
  try {
    let serviceCenter;

    // 🔐 Role-based access
    if (req.user.role === "SERVICE_CENTER") {
      serviceCenter = req.user.name;
    } else if (req.user.role === "FACTORY_ADMIN") {
      serviceCenter = req.query.serviceCenter;
    }

    if (!serviceCenter) {
      return res.status(400).json({
        message: "serviceCenter is required",
      });
    }

    /* --------------------------------------------------
     * STEP 1: Load all dispatches for service center
     * -------------------------------------------------- */
    const dispatches = await PartDispatch.find({
      serviceCenter,
    }).lean();

    /* --------------------------------------------------
     * STEP 2: Aggregate dispatched quantities
     * -------------------------------------------------- */
    const stockMap = {};

    for (const dispatch of dispatches) {
      for (const item of dispatch.dispatchedItems) {
        if (!stockMap[item.partCode]) {
          stockMap[item.partCode] = {
            partCode: item.partCode,
            partName: item.partName,
            dispatchedQty: 0,
            usedQty: 0,
            remainingQty: 0,
          };
        }
        stockMap[item.partCode].dispatchedQty += item.quantity;
      }
    }

    /* --------------------------------------------------
     * STEP 3: Aggregate consumed quantities
     * -------------------------------------------------- */
    const usedParts = await ReplacedPart.find({
      dispatch: { $in: dispatches.map((d) => d._id) },
      replacementType: "REPLACEMENT",
    }).lean();

    for (const used of usedParts) {
      if (stockMap[used.partCode]) {
        stockMap[used.partCode].usedQty += used.quantity;
      }
    }

    /* --------------------------------------------------
     * STEP 4: Calculate remaining stock
     * -------------------------------------------------- */
    Object.values(stockMap).forEach((item) => {
      item.remainingQty =
        item.dispatchedQty - item.usedQty;
    });

    return res.json({
      serviceCenter,
      stock: Object.values(stockMap),
    });
  } catch (error) {
    console.error("Get Stock Error:", error);
    return res.status(500).json({
      message: "Failed to fetch stock balance",
    });
  }
};