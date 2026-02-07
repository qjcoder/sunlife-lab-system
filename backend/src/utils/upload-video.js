/**
 * Video upload for installer installation submissions.
 * Stores in frontend/public/installer-videos
 */
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videosDir = path.join(__dirname, "../../..", "frontend", "public", "installer-videos");
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, videosDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".mp4").toLowerCase();
    cb(null, `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /mp4|webm|mov|quicktime/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  if (allowed.test(ext) || mime.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files (mp4, webm, mov) are allowed"));
  }
};

export const uploadInstallationVideo = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});
