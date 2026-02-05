/**
 * ====================================================
 * FILE UPLOAD CONFIGURATION
 * ====================================================
 * 
 * This module configures multer for handling file uploads.
 * 
 * USAGE:
 * import { upload } from '../utils/upload.js';
 * router.post('/upload', upload.single('image'), uploadHandler);
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to frontend/public/products directory
// Go up from backend/src/utils to backend, then to frontend/public/products
const productsDir = path.join(__dirname, '../../..', 'frontend', 'public', 'products');

// Ensure the products directory exists
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    // Get the modelCode from the request body or query
    const modelCode = req.body.modelCode || req.query.modelCode;
    
    if (modelCode) {
      // Use modelCode to generate filename
      const normalizedCode = modelCode.toLowerCase().trim();
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${normalizedCode}${ext}`);
    } else {
      // Fallback to original filename
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${Date.now()}${ext}`);
    }
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter,
});
