import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createOperator, listOperators } from "../controllers/operatorController.js";

const router = express.Router();

/**
 * ====================================================
 * OPERATOR ROUTES
 * ====================================================
 * 
 * All routes require FACTORY_ADMIN role
 */

// POST /api/operators - Create a new data entry operator
router.post("/", requireAuth, requireRole("FACTORY_ADMIN"), createOperator);

// GET /api/operators - List all data entry operators
router.get("/", requireAuth, requireRole("FACTORY_ADMIN"), listOperators);

export default router;
