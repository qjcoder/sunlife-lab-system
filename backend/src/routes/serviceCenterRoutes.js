import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createServiceCenter } from "../controllers/serviceCenterController.js";

const router = express.Router();

/**
 * ADMIN → CREATE SERVICE CENTER LOGIN
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createServiceCenter
);

export default router;