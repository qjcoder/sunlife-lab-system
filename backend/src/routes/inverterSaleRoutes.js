import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  sellInverterUnit,
  bulkSellInverters,
} from "../controllers/inverterSaleController.js";

/**
 * ====================================================
 * INVERTER SALE ROUTES
 * ====================================================
 * 
 * This module defines all inverter sale-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/inverter-sales/sell - Sell single inverter (FACTORY_ADMIN, DEALER, SUB_DEALER)
 * - POST /api/inverter-sales/bulk - Bulk sell inverters (DEALER, SUB_DEALER)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Role-based access control enforced per endpoint
 * 
 * BUSINESS RULES:
 * - Warranty starts at sale date
 * - Inverter must be owned by seller
 * - Inverter must not be already sold
 */
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