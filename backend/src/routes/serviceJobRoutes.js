import express from "express";
import {
  createServiceJob,
  listServiceJobs,
  getServiceJobDetails,
} from "../controllers/serviceJobController.js";
import replacedPartRoutes from "./replacedPartRoutes.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * LIST SERVICE JOBS
 *
 * ACCESS:
 * - SERVICE_CENTER → only their own jobs (filtered in controller)
 * - FACTORY_ADMIN → all service jobs
 *
 * GET /api/service-jobs
 */
router.get(
  "/",
  requireAuth,
  listServiceJobs
);

/**
 * SERVICE JOB DETAILS (D2)
 *
 * Returns:
 * - Service job details
 * - Inverter + model info
 * - Replaced parts (via controller)
 *
 * ACCESS:
 * - SERVICE_CENTER → only own jobs
 * - FACTORY_ADMIN → any job
 *
 * GET /api/service-jobs/:serviceJobId
 */
router.get(
  "/:serviceJobId",
  requireAuth,
  getServiceJobDetails
);

/**
 * CREATE SERVICE JOB
 *
 * Represents a single service visit
 *
 * ACCESS:
 * SERVICE_CENTER only
 *
 * POST /api/service-jobs
 */
router.post(
  "/",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  createServiceJob
);

/**
 * REPLACED PARTS (D3 – Nested Resource)
 *
 * A service job is the parent of replaced parts
 *
 * POST /api/service-jobs/:serviceJobId/replaced-parts
 *
 * ACCESS:
 * SERVICE_CENTER only
 */
router.use(
  "/:serviceJobId/replaced-parts",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  replacedPartRoutes
);

export default router;