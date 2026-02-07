import express from "express";
import { requireAuth, requireRole, requireSuperAdmin } from "../middleware/authMiddleware.js";
import { createServiceCenter, listServiceCenters, deleteServiceCenter } from "../controllers/serviceCenterController.js";

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
 * SUPER ADMIN ONLY → CREATE SERVICE CENTER
 * ====================================================
 * POST /api/service-centers
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  createServiceCenter
);

/**
 * ====================================================
 * SUPER ADMIN ONLY → LIST ALL SERVICE CENTERS
 * ====================================================
 * GET /api/service-centers
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  listServiceCenters
);

/**
 * ====================================================
 * SUPER ADMIN ONLY → DELETE SERVICE CENTER
 * ====================================================
 * DELETE /api/service-centers/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  deleteServiceCenter
);

export default router;