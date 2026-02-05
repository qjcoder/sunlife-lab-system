import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDealerHierarchy } from "../controllers/dealerHierarchyController.js";
import {
  createDealer,
  createSubDealer,
  listDealers,
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
 * FACTORY_ADMIN → CREATE MAIN DEALER
 * ====================================================
 * POST /api/dealers
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
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
 * FACTORY_ADMIN → DEALER HIERARCHY
 * ====================================================
 *
 * GET /api/dealers/hierarchy
 */
router.get(
  "/hierarchy",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  getDealerHierarchy
);

/**
 * ====================================================
 * FACTORY_ADMIN → LIST ALL DEALERS
 * ====================================================
 *
 * GET /api/dealers
 */
router.get(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  listDealers
);

export default router;