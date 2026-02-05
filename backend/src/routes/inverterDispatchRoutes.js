import express from "express";
import {
  createInverterDispatch,
} from "../controllers/inverterDispatchController.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";

/**
 * ====================================================
 * INVERTER DISPATCH ROUTES
 * ====================================================
 * 
 * This module defines all inverter dispatch-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/inverter-dispatches - Create factory dispatch to dealer (FACTORY_ADMIN)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Dispatch creation requires FACTORY_ADMIN role
 * 
 * BUSINESS RULES:
 * - Factory → Dealer inverter movement (ownership transfer, NOT sale)
 * - All serial numbers must exist and not be sold
 * - Entire request fails if any serial is invalid
 */
const router = express.Router();

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