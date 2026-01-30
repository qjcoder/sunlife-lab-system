import express from "express";
import { createServiceJob } from "../controllers/serviceJobController.js";
import replacedPartRoutes from "./replacedPartRoutes.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * SERVICE CENTER ONLY
 * Create service job
 */
router.post(
  "/",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  createServiceJob
);

/**
 * SERVICE CENTER ONLY
 * Replaced parts routes
 * POST /api/service-jobs/:serviceJobId/replaced-parts
 */
router.use(
  "/",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  replacedPartRoutes
);

export default router;