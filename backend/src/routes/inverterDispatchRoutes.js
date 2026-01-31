import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createInverterDispatch } from "../controllers/inverterDispatchController.js";

const router = express.Router();

/**
 * INVERTER DISPATCH ROUTES
 *
 * Handles bulk movement of inverter units
 * from Factory → Dealer
 *
 * Base URL:
 * /api/inverter-dispatches
 */

/**
 * CREATE INVERTER DISPATCH
 *
 * Factory admin sends multiple inverter units to a dealer
 *
 * METHOD: POST
 * URL: /api/inverter-dispatches
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createInverterDispatch
);

export default router;