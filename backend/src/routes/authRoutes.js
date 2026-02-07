import express from "express";
import { login, checkRole, resetPassword, createAdmin, listAdmins, deleteAdmin } from "../controllers/authController.js";
import { requireAuth, requireRole, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/check-role", checkRole);
router.post("/login", login);

router.get("/admins", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, listAdmins);
router.post("/create-admin", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, createAdmin);
router.delete("/admins/:id", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, deleteAdmin);

router.post("/reset-password", requireAuth, requireRole("FACTORY_ADMIN"), requireSuperAdmin, resetPassword);

export default router;
