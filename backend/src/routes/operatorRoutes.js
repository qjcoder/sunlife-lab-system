import express from "express";
import { requireAuth, requireRole, requireSuperAdmin } from "../middleware/authMiddleware.js";
import { createOperator, listOperators, deleteOperator } from "../controllers/operatorController.js";

const router = express.Router();

/**
 * ====================================================
 * OPERATOR ROUTES
 * ====================================================
 * 
 * All routes require FACTORY_ADMIN role
 */

// POST /api/operators - Super Admin only
router.post("/", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, createOperator);

// GET /api/operators - Super Admin only
router.get("/", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, listOperators);

// DELETE /api/operators/:id - Super Admin only
router.delete("/:id", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, deleteOperator);

export default router;
