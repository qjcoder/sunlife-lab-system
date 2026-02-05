import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createServiceCenter, listServiceCenters } from "../controllers/serviceCenterController.js";

/**
 * ====================================================
 * SERVICE CENTER ROUTES
 * ====================================================
 * 
 * This module defines all service center-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/service-centers - Create service center user (FACTORY_ADMIN)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Service center creation requires FACTORY_ADMIN role
 */
const router = express.Router();

/**
 * ====================================================
 * FACTORY_ADMIN → CREATE SERVICE CENTER
 * ====================================================
 * POST /api/service-centers
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createServiceCenter
);

/**
 * ====================================================
 * FACTORY_ADMIN → LIST ALL SERVICE CENTERS
 * ====================================================
 * GET /api/service-centers
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  listServiceCenters
);

export default router;