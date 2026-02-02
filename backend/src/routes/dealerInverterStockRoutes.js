import express from "express";
import { getDealerInverterStock } from "../controllers/dealerInverterStockController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * DEALER INVERTER STOCK
 *
 * GET /api/dealer-inverter-stock
 *
 * ACCESS:
 * - DEALER → own stock
 * - FACTORY_ADMIN → any dealer
 */
router.get(
  "/",
  requireAuth,
  requireRole("DEALER", "FACTORY_ADMIN"),
  getDealerInverterStock
);

export default router;