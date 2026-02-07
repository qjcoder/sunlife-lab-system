import express from "express";
import { requireAuth, requireRole, requireSuperAdmin } from "../middleware/authMiddleware.js";
import { getDealerHierarchy } from "../controllers/dealerHierarchyController.js";
import {
  createDealer,
  createSubDealer,
  listDealers,
  deleteDealer,
} from "../controllers/dealerController.js";

/**
 * ====================================================
 * DEALER ROUTES
 * ====================================================
 * 
 * This module defines all dealer-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/dealers - Create main dealer (FACTORY_ADMIN)
 * - POST /api/dealers/sub-dealer - Create sub-dealer (DEALER)
 * - GET /api/dealers/hierarchy - Get dealer hierarchy (FACTORY_ADMIN)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Role-based access control enforced
 */
const router = express.Router();

/**
 * ====================================================
 * SUPER ADMIN ONLY → CREATE MAIN DEALER
 * ====================================================
 * POST /api/dealers
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  createDealer
);

/**
 * ====================================================
 * DEALER → CREATE SUB-DEALER
 * ====================================================
 * POST /api/dealers/sub-dealer
 */
router.post(
  "/sub-dealer",
  requireAuth,
  requireRole("DEALER"),
  createSubDealer
);

/**
 * ====================================================
 * DEALER HIERARCHY
 * ====================================================
 * GET /api/dealers/hierarchy
 * - SUPER ADMIN: full hierarchy
 * - DEALER: own sub-dealers only (for Sub-Dealers page)
 */
router.get(
  "/hierarchy",
  requireAuth,
  requireRole("FACTORY_ADMIN", "DEALER"),
  (req, res, next) => {
    if (req.user.role === "DEALER") return next();
    requireSuperAdmin(req, res, next).catch(next);
  },
  getDealerHierarchy
);

/**
 * ====================================================
 * SUPER ADMIN ONLY → LIST ALL DEALERS
 * ====================================================
 *
 * GET /api/dealers
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  listDealers
);

/**
 * ====================================================
 * SUPER ADMIN ONLY → DELETE DEALER
 * ====================================================
 *
 * DELETE /api/dealers/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  requireSuperAdmin,
  deleteDealer
);

export default router;