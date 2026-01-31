import express from "express";
import {
  createInverterModel,
  listInverterModels,
} from "../controllers/inverterModelController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * CREATE INVERTER MODEL
 * ------------------------------------
 * Factory Admin only
 *
 * POST /api/inverter-models
 *
 * BODY:
 * {
 *   "brand": "Sunlife",
 *   "productLine": "SL-Sky",
 *   "variant": "4kW",
 *   "modelCode": "SL-Sky-4kW",
 *   "warranty": {
 *     "partsMonths": 12,
 *     "serviceMonths": 24
 *   }
 * }
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createInverterModel
);

/**
 * LIST ALL INVERTER MODELS
 * ------------------------------------
 * Used by:
 * - Factory (unit creation)
 * - UI dropdowns
 * - Analytics
 *
 * GET /api/inverter-models
 */
router.get(
  "/",
  requireAuth,
  listInverterModels
);

export default router;