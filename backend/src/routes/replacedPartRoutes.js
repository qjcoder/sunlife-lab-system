import express from "express";
import { addReplacedPart } from "../controllers/replacedPartController.js";

const router = express.Router();

/**
 * POST /api/service-jobs/:serviceJobId/replaced-parts
 * Add a replaced part to a service job
 */
router.post("/:serviceJobId/replaced-parts", addReplacedPart);

export default router;