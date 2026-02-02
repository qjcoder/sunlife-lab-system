import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

import {
  createInverterUnit,
  bulkCreateInverterUnits
} from "../controllers/inverterUnitController.js";

import { sellInverterUnit } from "../controllers/inverterSaleController.js";
import { getInverterLifecycle } from "../controllers/inverterLifecycleController.js";

const router = express.Router();

/**
 * ====================================================
 * FACTORY → Register SINGLE inverter unit
 * ====================================================
 * POST /api/inverters
 * ROLE: FACTORY_ADMIN
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createInverterUnit
);

/**
 * ====================================================
 * FACTORY → BULK Register inverter units
 * ====================================================
 * POST /api/inverters/bulk
 * ROLE: FACTORY_ADMIN
 */
router.post(
  "/bulk",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  bulkCreateInverterUnits
);

/**
 * ====================================================
 * DEALER → Sell inverter to customer
 * ====================================================
 * POST /api/inverters/sell
 * ROLE: DEALER, FACTORY_ADMIN
 */
router.post(
  "/sell",
  requireAuth,
  requireRole("DEALER", "FACTORY_ADMIN"),
  sellInverterUnit
);

/**
 * ====================================================
 * FULL INVERTER LIFECYCLE
 * ====================================================
 * GET /api/inverters/:serialNumber/lifecycle
 */
router.get(
  "/:serialNumber/lifecycle",
  requireAuth,
  getInverterLifecycle
);

export default router;