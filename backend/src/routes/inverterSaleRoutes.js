import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { sellInverterUnit } from "../controllers/inverterSaleController.js";

const router = express.Router();

/**
 * DEALER → CUSTOMER SALE
 *
 * Warranty starts from saleDate
 *
 * POST /api/inverter-sales
 */
router.post(
  "/",
  requireAuth,
  requireRole("DEALER", "FACTORY_ADMIN"),
  sellInverterUnit
);

export default router;