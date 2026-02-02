import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  bulkCreateInverterUnits,
} from "../controllers/inverterUnitController.js";

const router = express.Router();

/**
 * BULK REGISTER INVERTER UNITS
 *
 * POST /api/inverter-units/bulk
 * ROLE: FACTORY_ADMIN
 */
router.post(
  "/bulk",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  bulkCreateInverterUnits
);

export default router;