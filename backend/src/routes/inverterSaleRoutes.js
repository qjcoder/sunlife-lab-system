import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  sellInverterUnit,
  bulkSellInverters,
} from "../controllers/inverterSaleController.js";

const router = express.Router();

/**
 * ====================================================
 * SINGLE INVERTER SALE
 * ====================================================
 * Factory / Dealer / Sub-Dealer → Customer
 * Warranty STARTS
 *
 * POST /api/inverter-sales/sell
 */
router.post(
  "/sell",
  requireAuth,
  requireRole("FACTORY_ADMIN", "DEALER", "SUB_DEALER"), // ✅ FIX
  sellInverterUnit
);

/**
 * ====================================================
 * BULK INVERTER SALE
 * ====================================================
 * Dealer / Sub-Dealer → Customers
 *
 * POST /api/inverter-sales/bulk
 */
router.post(
  "/bulk",
  requireAuth,
  requireRole("DEALER", "SUB_DEALER"), // ✅ FIX
  bulkSellInverters
);

export default router;