// src/routes/inverterStockRoutes.js

import express from "express";
import { getDealerInverterStock } from "../controllers/inverterStockController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/inverter-stock
 *
 * Dealer stock = dispatched but not sold inverters
 *
 * ACCESS:
 * - DEALER → own stock
 * - FACTORY_ADMIN → ?dealer=Dealer Name
 */
router.get(
  "/",
  requireAuth,
  requireRole("DEALER", "FACTORY_ADMIN"),
  getDealerInverterStock
);

// 🚨 THIS LINE MUST EXIST
export default router;