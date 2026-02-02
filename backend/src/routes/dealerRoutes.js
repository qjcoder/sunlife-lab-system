import express from "express";
import { createDealer } from "../controllers/dealerController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * FACTORY ADMIN → CREATE DEALER
 * POST /api/dealers
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createDealer
);

export default router;