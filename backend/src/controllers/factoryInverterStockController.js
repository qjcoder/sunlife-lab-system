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
    const stock = await InverterUnit.find({
      dealer: null, // 👈 still in factory
    })
      .populate("inverterModel", "brand productLine variant modelCode")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: stock.length,
      stock,
    });
  } catch (error) {
    console.error("Factory Stock Error:", error);
    res.status(500).json({
      message: "Failed to fetch factory inverter stock",
    });
  }
};