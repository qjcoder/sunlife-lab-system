import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

import { createInverterUnit } 
  from "../controllers/inverterUnitController.js";

import { getInverterLifecycle } 
  from "../controllers/inverterLifecycleController.js";

import { sellInverterUnit } 
  from "../controllers/inverterSaleController.js";

const router = express.Router();

/**
 * FACTORY → Register inverter unit
 * Physical unit creation (NO sale info)
 *
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
 * DEALER / ADMIN → Sell inverter to customer
 * Starts warranty
 *
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
 * FULL INVERTER LIFECYCLE
 * Factory → Sale → Warranty → Service → Replacement
 *
 * GET /api/inverters/:serialNumber/lifecycle
 * ROLE: Any authenticated user (filtered inside controller if needed)
 */
router.get(
  "/:serialNumber/lifecycle",
  requireAuth,
  getInverterLifecycle
);

export default router;