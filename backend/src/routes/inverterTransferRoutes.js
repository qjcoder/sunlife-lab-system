import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { transferToSubDealer } from "../controllers/inverterTransferController.js";

const router = express.Router();

/**
 * DEALER → SUB-DEALER TRANSFER
 */
router.post(
  "/dealer-to-subdealer",
  requireAuth,
  requireRole("DEALER"),
  transferToSubDealer
);

export default router;