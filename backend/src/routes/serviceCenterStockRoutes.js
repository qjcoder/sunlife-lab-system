// src/routes/serviceCenterStockRoutes.js
import express from "express";
import { getServiceCenterStock } from "../controllers/serviceCenterStockController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/service-center-stock
 */
router.get(
  "/",
  requireAuth,
  requireRole("SERVICE_CENTER", "FACTORY_ADMIN"),
  getServiceCenterStock
);

export default router;