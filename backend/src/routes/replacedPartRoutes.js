import express from "express";
import { addReplacedPart } from "../controllers/replacedPartController.js";

const router = express.Router({ mergeParams: true });

/**
 * ADD REPLACED PART
 *
 * Parent route already contains:
 * /api/service-jobs/:serviceJobId
 *
 * So we ONLY define the tail here.
 *
 * FINAL URL:
 * POST /api/service-jobs/:serviceJobId/replaced-parts
 *
 * ACCESS:
 * SERVICE_CENTER only (middleware applied in parent)
 */
router.post("/", addReplacedPart);

export default router;