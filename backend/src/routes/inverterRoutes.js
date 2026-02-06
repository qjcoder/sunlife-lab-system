import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

import {
  createInverterUnit,
  bulkCreateInverterUnits
} from "../controllers/inverterUnitController.js";

import { sellInverterUnit } from "../controllers/inverterSaleController.js";
import { getInverterLifecycle } from "../controllers/inverterLifecycleController.js";

/**
 * ====================================================
 * INVERTER ROUTES
 * ====================================================
 * 
 * This module defines all inverter unit-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/inverters - Register single inverter unit (FACTORY_ADMIN)
 * - POST /api/inverters/bulk - Bulk register inverter units (FACTORY_ADMIN)
 * - POST /api/inverters/sell - Sell inverter to customer (DEALER, FACTORY_ADMIN)
 * - GET /api/inverters/:serialNumber/lifecycle - Get inverter lifecycle (AUTHENTICATED)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Role-based access control enforced per endpoint
 */
const router = express.Router();

/**
 * ====================================================
 * FACTORY / DATA ENTRY → Register SINGLE inverter unit
 * ====================================================
 * POST /api/inverters
 * ROLE: FACTORY_ADMIN, DATA_ENTRY_OPERATOR
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN", "DATA_ENTRY_OPERATOR"),
  createInverterUnit
);

/**
 * ====================================================
 * FACTORY / DATA ENTRY → BULK Register inverter units
 * ====================================================
 * POST /api/inverters/bulk
 * ROLE: FACTORY_ADMIN, DATA_ENTRY_OPERATOR
 */
router.post(
  "/bulk",
  requireAuth,
  requireRole("FACTORY_ADMIN", "DATA_ENTRY_OPERATOR"),
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
 * ROLE: FACTORY_ADMIN, SERVICE_CENTER, INSTALLER_PROGRAM_MANAGER
 */
router.get(
  "/:serialNumber/lifecycle",
  requireAuth,
  requireRole("FACTORY_ADMIN", "SERVICE_CENTER", "INSTALLER_PROGRAM_MANAGER"),
  getInverterLifecycle
);

export default router;