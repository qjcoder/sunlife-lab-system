import express from "express";
import { getFactoryInverterStock } from "../controllers/factoryInverterStockController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET FACTORY INVERTER STOCK
 *
 * ACCESS:
 * - FACTORY_ADMIN only
 *
 * GET /api/factory-inverter-stock
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  getFactoryInverterStock
);

export default router;