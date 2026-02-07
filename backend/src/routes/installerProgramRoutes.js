import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getActiveProgram,
  listPrograms,
  createProgram,
  updateProgram,
  listRewardRules,
  upsertRewardRule,
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  listSubmissions,
  verifySubmission,
  rejectSubmission,
  getLeaderboard,
  listInstallers,
  createInstaller,
} from "../controllers/installerProgramController.js";
import {
  submitInstallation,
  listMySubmissions,
  getMyStats,
} from "../controllers/installationSubmissionController.js";
import { uploadInstallationVideo } from "../utils/upload-video.js";

const router = express.Router();

// --- Public / shared ---
router.get("/program/active", getActiveProgram);

// --- Manager only (INSTALLER_PROGRAM_MANAGER) ---
router.get("/installers", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), listInstallers);
router.post("/installers", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), createInstaller);

router.get("/programs", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), listPrograms);
router.post("/programs", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), createProgram);
router.put("/programs/:id", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), updateProgram);

router.get("/reward-rules", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), listRewardRules);
router.post("/reward-rules", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), upsertRewardRule);

router.get("/milestones", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), listMilestones);
router.post("/milestones", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), createMilestone);
router.put("/milestones/:id", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), updateMilestone);
router.delete("/milestones/:id", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), deleteMilestone);

router.get("/submissions", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), listSubmissions);
router.post("/submissions/:id/verify", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), verifySubmission);
router.post("/submissions/:id/reject", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), rejectSubmission);
router.get("/leaderboard", requireAuth, requireRole("INSTALLER_PROGRAM_MANAGER"), getLeaderboard);

// --- Installer (or manager on behalf) ---
router.post(
  "/submit",
  requireAuth,
  requireRole("INSTALLER", "INSTALLER_PROGRAM_MANAGER"),
  uploadInstallationVideo.single("video"),
  submitInstallation
);
router.get("/my-submissions", requireAuth, requireRole("INSTALLER", "INSTALLER_PROGRAM_MANAGER"), listMySubmissions);
router.get("/my-stats", requireAuth, requireRole("INSTALLER", "INSTALLER_PROGRAM_MANAGER"), getMyStats);

export default router;
