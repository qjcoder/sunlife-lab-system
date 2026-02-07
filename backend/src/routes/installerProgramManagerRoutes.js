import express from "express";
import { requireAuth, requireRole, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
  createInstallerProgramManager,
  listInstallerProgramManagers,
  deleteInstallerProgramManager,
} from "../controllers/installerProgramManagerController.js";

const router = express.Router();

router.post("/", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, createInstallerProgramManager);
router.get("/", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, listInstallerProgramManagers);
router.delete("/:id", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, deleteInstallerProgramManager);

export default router;
