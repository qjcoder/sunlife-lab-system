import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { transferToSubDealer } from "../controllers/inverterTransferController.js";

/**
 * ====================================================
 * INVERTER TRANSFER ROUTES
 * ====================================================
 * 
 * This module defines all inverter transfer-related API endpoints.
 * 
 * ROUTES:
 * - POST /api/inverter-transfers/dealer-to-subdealer - Transfer inverters to sub-dealer (DEALER)
 * 
 * AUTHENTICATION:
 * - All routes require authentication
 * - Transfer requires DEALER role
 * 
 * BUSINESS RULES:
 * - Ownership transfer only (NO warranty start)
 * - Dealer must own inverter
 * - Sub-dealer must belong to dealer
 * - Entire request fails if any serial is invalid
 */
const router = express.Router();
router.post(
  "/dealer-to-subdealer",
  requireAuth,
  requireRole("DEALER"),
  transferToSubDealer
);

export default router;