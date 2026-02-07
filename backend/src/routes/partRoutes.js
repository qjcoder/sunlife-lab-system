import express from "express";
import {
  listParts,
  createPart,
  updatePart,
  deletePart,
} from "../controllers/partController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, listParts);
router.post("/", requireAuth, requireRole("FACTORY_ADMIN"), createPart);
router.put("/:id", requireAuth, requireRole("FACTORY_ADMIN"), updatePart);
router.delete("/:id", requireAuth, requireRole("FACTORY_ADMIN"), deletePart);

export default router;
