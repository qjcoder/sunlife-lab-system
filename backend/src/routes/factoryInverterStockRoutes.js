import express from "express";
import { getFactoryInverterStock } from "../controllers/factoryInverterStockController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET FACTORY INVERTER STOCK
 *
 * ACCESS:
 * - FACTORY_ADMIN, DATA_ENTRY_OPERATOR (for Product Serial Entry stock counts)
 *
 * GET /api/factory-inverter-stock
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN", "DATA_ENTRY_OPERATOR"),
  getFactoryInverterStock
);

export default router;