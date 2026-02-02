import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { transferToSubDealer } from "../controllers/dealerTransferController.js";

const router = express.Router();

/**
 * DEALER → SUB-DEALER TRANSFER
 *
 * POST /api/dealer-transfers
 */
router.post(
  "/",
  requireAuth,
  requireRole("DEALER"),
  transferToSubDealer
);

export default router;