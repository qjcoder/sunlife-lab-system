import express from "express";
import {
  createPartDispatch,
  listPartDispatches,
} from "../controllers/partDispatchController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

/**
 * ====================================================
 * PART DISPATCH ROUTES
 * ====================================================
 * 
 * This module defines all part dispatch-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/part-dispatches - Create part dispatch (FACTORY_ADMIN)
 * - GET /api/part-dispatches - List part dispatches (FACTORY_ADMIN, SERVICE_CENTER)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Part dispatch creation requires FACTORY_ADMIN role
 * - Service centers can only view their own dispatches
 */
const router = express.Router();

/**
 * CREATE PART DISPATCH
 * Factory → Service Center (stock movement)
 *
 * POST /api/part-dispatches
 * ROLE: FACTORY_ADMIN
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createPartDispatch
);

/**
 * LIST PART DISPATCHES
 * - FACTORY_ADMIN → all dispatches
 * - SERVICE_CENTER → own only
 *
 * GET /api/part-dispatches
 */
router.get(
  "/",
  requireAuth,
  listPartDispatches
);

export default router;