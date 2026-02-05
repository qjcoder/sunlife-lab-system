import express from "express";
import {
  createSingleSerialEntry,
  createBulkSerialEntry,
  getSerialEntryHistory,
} from "../controllers/operatorSerialEntryController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ====================================================
 * OPERATOR SERIAL ENTRY ROUTES
 * ====================================================
 * 
 * All routes require DATA_ENTRY_OPERATOR role
 */

router.post(
  "/single",
  requireAuth,
  requireRole("DATA_ENTRY_OPERATOR"),
  createSingleSerialEntry
);

router.post(
  "/bulk",
  requireAuth,
  requireRole("DATA_ENTRY_OPERATOR"),
  createBulkSerialEntry
);

router.get(
  "/history",
  requireAuth,
  requireRole("DATA_ENTRY_OPERATOR"),
  getSerialEntryHistory
);

export default router;
