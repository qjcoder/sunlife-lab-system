import express from "express";
import {
  createInverterDispatch,
} from "../controllers/inverterDispatchController.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ====================================================
 * INVERTER DISPATCH ROUTES
 * ====================================================
 *
 * Factory → Dealer inverter movement
 * (Ownership transfer, NOT sale)
 */

/**
 * CREATE DISPATCH
 *
 * POST /api/inverter-dispatches
 *
 * ROLE:
 * - FACTORY_ADMIN
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createInverterDispatch
);

export default router;