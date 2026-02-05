/**
 * ====================================================
 * PDF UPLOAD CONFIGURATION
 * ====================================================
 * 
 * This module configures multer for handling PDF file uploads (datasheets).
 * 
 * USAGE:
 * import { uploadPDF } from '../utils/upload-pdf.js';
 * router.post('/upload-datasheet', uploadPDF.single('datasheet'), uploadHandler);
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to frontend/public/products/datasheets directory
const datasheetsDir = path.join(__dirname, '../../..', 'frontend', 'public', 'products', 'datasheets');

// Ensure the datasheets directory exists
if (!fs.existsSync(datasheetsDir)) {
  fs.mkdirSync(datasheetsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, datasheetsDir);
  },
  filename: (req, file, cb) => {
    // Get the modelCode from the request body or query
    const modelCode = req.body.modelCode || req.query.modelCode;
    
    if (modelCode) {
      // Use modelCode to generate filename
      const normalizedCode = modelCode.toLowerCase().trim();
      const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
      cb(null, `${normalizedCode}${ext}`);
    } else {
      // Fallback to original filename
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${Date.now()}${ext}`);
    }
  },
});

// File filter - only allow PDF files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Configure multer for PDF uploads
export const uploadPDF = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size for PDFs
  },
  fileFilter,
});
