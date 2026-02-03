import express from "express";
import { login, checkRole } from "../controllers/authController.js";

const router = express.Router();

router.post("/check-role", checkRole);
router.post("/login", login);

export default router;
