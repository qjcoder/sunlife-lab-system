import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createInstallerProgramManager,
  listInstallerProgramManagers,
  deleteInstallerProgramManager,
} from "../controllers/installerProgramManagerController.js";

const router = express.Router();

router.post("/", requireAuth, requireRole("FACTORY_ADMIN"), createInstallerProgramManager);
router.get("/", requireAuth, requireRole("FACTORY_ADMIN"), listInstallerProgramManagers);
router.delete("/:id", requireAuth, requireRole("FACTORY_ADMIN"), deleteInstallerProgramManager);

export default router;
