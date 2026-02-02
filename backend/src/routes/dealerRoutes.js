import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDealerHierarchy } from "../controllers/dealerHierarchyController.js";
import {
  createDealer,
  createSubDealer,
} from "../controllers/dealerController.js";

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


export default router;