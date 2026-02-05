import express from "express";
import {
  createInverterModel,
  listInverterModels,
  updateInverterModel,
  deleteInverterModel,
  uploadProductImage,
  uploadProductDatasheet,
} from "../controllers/inverterModelController.js";
import { upload } from "../utils/upload.js";
import { uploadPDF } from "../utils/upload-pdf.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * CREATE INVERTER MODEL
 * ------------------------------------
 * Factory Admin only
 *
 * POST /api/inverter-models
 *
 * BODY:
 * {
 *   "brand": "Sunlife",
 *   "productLine": "SL-Sky",
 *   "variant": "4kW",
 *   "modelCode": "SL-Sky-4kW",
 *   "warranty": {
 *     "partsMonths": 12,
 *     "serviceMonths": 24
 *   }
 * }
 */
router.post(
  "/",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  createInverterModel
);

/**
 * LIST ALL INVERTER MODELS
 * ------------------------------------
 * Used by:
 * - Factory (unit creation)
 * - UI dropdowns
 * - Analytics
 *
 * GET /api/inverter-models
 */
router.get(
  "/",
  requireAuth,
  listInverterModels
);

/**
 * UPDATE INVERTER MODEL
 * ------------------------------------
 * Factory Admin only
 *
 * PUT /api/inverter-models/:id
 */
router.put(
  "/:id",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  updateInverterModel
);

/**
 * DELETE INVERTER MODEL
 * ------------------------------------
 * Factory Admin only
 *
 * DELETE /api/inverter-models/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  deleteInverterModel
);

/**
 * UPLOAD PRODUCT IMAGE
 * ------------------------------------
 * Factory Admin only
 *
 * POST /api/inverter-models/:id/upload-image
 *
 * BODY:
 * FormData with 'image' field and 'modelCode' field
 */
router.post(
  "/:id/upload-image",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  upload.single('image'),
  uploadProductImage
);

/**
 * UPLOAD PRODUCT DATASHEET (PDF)
 * ------------------------------------
 * Factory Admin only
 *
 * POST /api/inverter-models/:id/upload-datasheet
 *
 * BODY:
 * FormData with 'datasheet' field and 'modelCode' field
 */
router.post(
  "/:id/upload-datasheet",
  requireAuth,
  requireRole("FACTORY_ADMIN"),
  uploadPDF.single('datasheet'),
  uploadProductDatasheet
);

export default router;