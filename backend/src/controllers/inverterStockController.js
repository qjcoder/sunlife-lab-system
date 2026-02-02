// src/controllers/inverterStockController.js

import InverterUnit from "../models/InverterUnit.js";

/**
 * GET DEALER INVERTER STOCK
 *
 * Definition:
 * - Inverters dispatched to dealer
 * - NOT yet sold
 *
 * ACCESS:
 * - DEALER → own stock
 * - FACTORY_ADMIN → ?dealer=Dealer Name
 */
export const getDealerInverterStock = async (req, res) => {
  try {
    let dealer;

    // 🔐 Role-based dealer resolution
    if (req.user.role === "DEALER") {
      dealer = req.user.name;
    }

    if (req.user.role === "FACTORY_ADMIN") {
      dealer = req.query.dealer;
    }

    if (!dealer) {
      return res.status(400).json({
        message: "dealer is required",
      });
    }

    // 🔎 Fetch unsold inverter units
    const inverters = await InverterUnit.find({
      dealer,
      saleDate: null, // unsold = stock
    })
      .populate("inverterModel", "brand productLine variant modelCode")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      dealer,
      count: inverters.length,
      stock: inverters,
    });
  } catch (error) {
    console.error("Get Dealer Inverter Stock Error:", error);
    return res.status(500).json({
      message: "Failed to fetch inverter stock",
    });
  }
};