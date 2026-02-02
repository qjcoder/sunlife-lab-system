import PartDispatch from "../models/PartDispatch.js";
import ReplacedPart from "../models/ReplacedPart.js";

/**
 * GET SERVICE CENTER STOCK (DERIVED VIEW)
 * ----------------------------------------------------
 * This endpoint returns a READ-ONLY stock summary
 * calculated from immutable audit records.
 *
 * IMPORTANT:
 * - Stock is NOT stored in a table
 * - Stock is DERIVED as:
 *
 *     totalDispatchedQty − usedQty = remainingQty
 *
 * SOURCES:
 * + PartDispatch   → stock coming IN
 * − ReplacedPart   → stock going OUT
 *
 * WHY THIS DESIGN?
 * - Prevents manual stock corruption
 * - Full audit trail
 * - Reproducible stock at any point in time
 *
 * ACCESS:
 * - SERVICE_CENTER → can view ONLY own stock
 * - FACTORY_ADMIN  → must specify serviceCenter
 *
 * ENDPOINT:
 * GET /api/service-center-stock
 * GET /api/service-center-stock?serviceCenter=Lahore Service Center
 */
export const getServiceCenterStock = async (req, res) => {
  try {
    let serviceCenter;

    /* --------------------------------------------------
     * STEP 1: Resolve service center context
     * -------------------------------------------------- */
    if (req.user.role === "SERVICE_CENTER") {
      // Service center sees ONLY its own stock
      serviceCenter = req.user.name;
    } else if (req.user.role === "FACTORY_ADMIN") {
      // Factory admin must explicitly specify service center
      serviceCenter = req.query.serviceCenter;
    }

    if (!serviceCenter) {
      return res.status(400).json({
        message: "serviceCenter is required",
      });
    }

    /* --------------------------------------------------
     * STEP 2: Fetch all dispatches to this service center
     * -------------------------------------------------- */
    const dispatches = await PartDispatch.find({
      serviceCenter,
    }).lean();

    const stockMap = {};
    const dispatchIds = [];

    /* --------------------------------------------------
     * STEP 3: Aggregate TOTAL dispatched quantities
     * -------------------------------------------------- */
    for (const dispatch of dispatches) {
      dispatchIds.push(dispatch._id);

      for (const item of dispatch.dispatchedItems) {
        if (!stockMap[item.partCode]) {
          stockMap[item.partCode] = {
            partCode: item.partCode,
            partName: item.partName,

            // Lifetime quantity sent from factory
            totalDispatchedQty: 0,

            // Quantity consumed in replacements
            usedQty: 0,

            // Calculated later
            remainingQty: 0,
          };
        }

        stockMap[item.partCode].totalDispatchedQty += item.quantity;
      }
    }

    /* --------------------------------------------------
     * STEP 4: Aggregate USED quantities (REPLACEMENTS)
     * -------------------------------------------------- */
    const usedParts = await ReplacedPart.find({
      dispatch: { $in: dispatchIds },
      replacementType: "REPLACEMENT", // REPAIR does NOT consume stock
    }).lean();

    for (const used of usedParts) {
      if (stockMap[used.partCode]) {
        stockMap[used.partCode].usedQty += used.quantity;
      }
    }

    /* --------------------------------------------------
     * STEP 5: Calculate remaining stock
     * -------------------------------------------------- */
    Object.values(stockMap).forEach((item) => {
      item.remainingQty =
        item.totalDispatchedQty - item.usedQty;
    });

    /* --------------------------------------------------
     * STEP 6: Response
     * -------------------------------------------------- */
    return res.json({
      serviceCenter,
      stock: Object.values(stockMap),
    });
  } catch (error) {
    console.error("Get Service Center Stock Error:", error);
    return res.status(500).json({
      message: "Failed to fetch service center stock",
    });
  }
};