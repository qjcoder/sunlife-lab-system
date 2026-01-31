import express from "express";
import { getServiceCenterStock } from "../controllers/stockController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get stock balance for service center
 */
router.get(
  "/service-center",
  requireAuth,
  getServiceCenterStock
);

export default router;