import InverterUnit from "../models/InverterUnit.js";

/**
 * GET FACTORY INVERTER STOCK
 * ------------------------------------
 * Inverters that:
 * - Exist in system
 * - NOT dispatched to any dealer
 *
 * ACCESS:
 * - FACTORY_ADMIN only
 *
 * URL:
 * GET /api/factory-inverter-stock
 */
export const getFactoryInverterStock = async (req, res) => {
  try {
    const [stock, totalCount, dispatchedCount] = await Promise.all([
      InverterUnit.find({ dealer: null })
        .populate("inverterModel", "brand productLine variant modelCode")
        .sort({ createdAt: -1 })
        .lean(),
      InverterUnit.countDocuments(),
      InverterUnit.countDocuments({ dealer: { $ne: null, $exists: true } }),
    ]);

    return res.json({
      count: stock.length,
      totalCount: totalCount ?? 0,
      dispatchedCount: dispatchedCount ?? 0,
      stock,
    });
  } catch (error) {
    console.error("Factory Stock Error:", error);
    res.status(500).json({
      message: "Failed to fetch factory inverter stock",
    });
  }
};