import express from "express";
import {
  createPartDispatch,
  listPartDispatches,
} from "../controllers/partDispatchController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

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