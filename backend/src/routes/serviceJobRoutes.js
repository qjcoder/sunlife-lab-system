import express from "express";
import {
  createServiceJob,
  listServiceJobs,
  getServiceJobDetails,
} from "../controllers/serviceJobController.js";
import replacedPartRoutes from "./replacedPartRoutes.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

/**
 * ====================================================
 * SERVICE JOB ROUTES
 * ====================================================
 * 
 * This module defines all service job-related API endpoints.
 * 
 * ROUTES:
 * - GET /api/service-jobs - List service jobs (AUTHENTICATED)
 * - GET /api/service-jobs/:serviceJobId - Get service job details (AUTHENTICATED)
 * - POST /api/service-jobs - Create service job (SERVICE_CENTER)
 * - POST /api/service-jobs/:serviceJobId/replaced-parts - Add replaced part (SERVICE_CENTER)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Service job creation and part replacement require SERVICE_CENTER role
 */
const router = express.Router();

/**
 * LIST SERVICE JOBS
 * GET /api/service-jobs
 */
router.get("/", requireAuth, listServiceJobs);

/**
 * SERVICE JOB DETAILS
 * GET /api/service-jobs/:serviceJobId
 */
router.get("/:serviceJobId", requireAuth, getServiceJobDetails);

/**
 * CREATE SERVICE JOB
 * POST /api/service-jobs
 */
router.post(
  "/",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  createServiceJob
);

/**
 * REPLACED PARTS (Nested Resource)
 *
 * BASE:
 * /api/service-jobs/:serviceJobId/replaced-parts
 */
router.use(
  "/:serviceJobId/replaced-parts",
  requireAuth,
  requireRole("SERVICE_CENTER"),
  replacedPartRoutes
);

export default router;