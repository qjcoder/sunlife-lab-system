import InverterModel from "../models/InverterModel.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CREATE INVERTER MODEL
 *
 * Represents a PRODUCT definition (not a physical unit).
 * Created once by FACTORY ADMIN.
 *
 * Examples:
 *  Brand: Sunlife
 *  Product Line: SL-Sky
 *  Variant: 4kW
 *  Model Code: SL-Sky-4kW
 *
 * URL:
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
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const createInverterModel = async (req, res) => {
  try {
    const { brand, productLine, variant, modelCode, warranty } = req.body;

    // 1️⃣ Basic validation
    if (!brand || !productLine || !variant || !modelCode) {
      return res.status(400).json({
        message: "brand, productLine, variant, and modelCode are required",
      });
    }

    // 2️⃣ Warranty shape validation (important for analytics later)
    if (
      warranty &&
      (typeof warranty.partsMonths !== "number" ||
        typeof warranty.serviceMonths !== "number")
    ) {
      return res.status(400).json({
        message: "warranty must include partsMonths and serviceMonths",
      });
    }

    // 3️⃣ Prevent duplicate model codes
    const existing = await InverterModel.findOne({ modelCode });
    if (existing) {
      return res.status(409).json({
        message: "Inverter model with this modelCode already exists",
      });
    }

    // 4️⃣ Create inverter model (MASTER RECORD)
    // Compute modelName from brand + productLine + variant
    const modelName = `${brand} ${productLine} ${variant}`.trim();
    
    // Generate image path based on modelCode (or use provided image)
    const imagePath = req.body.image || `/products/${modelCode.toLowerCase()}.jpg`;
    
    // Generate datasheet path if provided
    const datasheetPath = req.body.datasheet || undefined;
    
    const inverterModel = await InverterModel.create({
      brand,
      productLine,
      variant,
      modelCode,
      modelName,
      image: imagePath,
      datasheet: datasheetPath,
      warranty,
      active: req.body.active !== undefined ? req.body.active : true, // default to true
    });

    return res.status(201).json({
      message: "Inverter model created successfully",
      inverterModel,
    });
  } catch (error) {
    console.error("Create Inverter Model Error:", error);
    return res.status(500).json({
      message: "Failed to create inverter model",
    });
  }
};

/**
 * LIST INVERTER MODELS
 *
 * Used by factory / UI dropdowns
 *
 * URL:
 * GET /api/inverter-models
 */
export const listInverterModels = async (req, res) => {
  try {
    // Get query parameter to filter by active status
    // If no parameter, show all models (for registration dropdown)
    // If ?active=true, show only active models (for models page)
    const { active } = req.query;
    
    let query = {};
    if (active === 'true') {
      query = { active: true };
    } else if (active === 'false') {
      query = { active: false };
    }
    // If no active parameter, show all models (for registration dropdown)
    
    const models = await InverterModel.find(query)
      .sort({ brand: 1, productLine: 1, variant: 1 })
      .lean();

    return res.json({
      count: models.length,
      data: models,
    });
  } catch (error) {
    console.error("List Inverter Models Error:", error);
    return res.status(500).json({
      message: "Failed to fetch inverter models",
    });
  }
};

/**
 * UPDATE INVERTER MODEL
 *
 * URL:
 * PUT /api/inverter-models/:id
 *
 * BODY:
 * {
 *   "brand": "Sunlife",
 *   "productLine": "SL-Sky",
 *   "variant": "4kW",
 *   "modelCode": "SL-Sky-4kW",
 *   "image": "/products/sl-sky-4kw.jpg",
 *   "active": true,
 *   "warranty": {
 *     "partsMonths": 12,
 *     "serviceMonths": 24
 *   }
 * }
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const updateInverterModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, productLine, variant, modelCode, image, active, warranty } = req.body;

    // Find the model
    const model = await InverterModel.findById(id);
    if (!model) {
      return res.status(404).json({
        message: "Inverter model not found",
      });
    }

    // Update fields
    if (brand !== undefined) model.brand = brand;
    if (productLine !== undefined) model.productLine = productLine;
    if (variant !== undefined) model.variant = variant;
    if (modelCode !== undefined) {
      // Check for duplicate model code (if changed)
      if (modelCode !== model.modelCode) {
        const existing = await InverterModel.findOne({ modelCode });
        if (existing) {
          return res.status(409).json({
            message: "Inverter model with this modelCode already exists",
          });
        }
        model.modelCode = modelCode;
      }
    }
    if (image !== undefined) model.image = image;
    if (req.body.datasheet !== undefined) model.datasheet = req.body.datasheet;
    if (active !== undefined) model.active = active;
    if (warranty !== undefined) {
      if (warranty.partsMonths !== undefined) model.warranty.partsMonths = warranty.partsMonths;
      if (warranty.serviceMonths !== undefined) model.warranty.serviceMonths = warranty.serviceMonths;
    }

    // Recompute modelName if brand/productLine/variant changed
    if (brand !== undefined || productLine !== undefined || variant !== undefined) {
      model.modelName = `${model.brand} ${model.productLine} ${model.variant}`.trim();
    }

    // Save the model
    await model.save();

    return res.json({
      message: "Inverter model updated successfully",
      inverterModel: model,
    });
  } catch (error) {
    console.error("Update Inverter Model Error:", error);
    return res.status(500).json({
      message: "Failed to update inverter model",
    });
  }
};

/**
 * DELETE INVERTER MODEL
 *
 * URL:
 * DELETE /api/inverter-models/:id
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const deleteInverterModel = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await InverterModel.findById(id);
    if (!model) {
      return res.status(404).json({
        message: "Inverter model not found",
      });
    }

    await InverterModel.findByIdAndDelete(id);

    return res.json({
      message: "Inverter model deleted successfully",
    });
  } catch (error) {
    console.error("Delete Inverter Model Error:", error);
    return res.status(500).json({
      message: "Failed to delete inverter model",
    });
  }
};

/**
 * UPLOAD PRODUCT IMAGE
 *
 * URL:
 * POST /api/inverter-models/:id/upload-image
 *
 * BODY:
 * FormData with 'image' field and 'modelCode' field
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const modelCode = req.body.modelCode;

    if (!file) {
      return res.status(400).json({
        message: "No image file provided",
      });
    }

    // Find the model
    const model = await InverterModel.findById(id);
    if (!model) {
      // Delete uploaded file if model not found
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error("Error deleting file:", err);
        }
      }
      return res.status(404).json({
        message: "Inverter model not found",
      });
    }

    // Get the modelCode from model if not provided in body
    const targetModelCode = modelCode || model.modelCode;
    
    // Generate the correct filename based on modelCode
    const normalizedCode = targetModelCode.toLowerCase().trim();
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const correctFilename = `${normalizedCode}${ext}`;
    const productsDir = path.dirname(file.path);
    const correctPath = path.join(productsDir, correctFilename);

    // Check if old image exists and rename it with version suffix
    if (fs.existsSync(correctPath)) {
      try {
        // Find the next available version number
        let version = 1;
        let versionedPath;
        do {
          const versionedFilename = `${normalizedCode}-v${version}${ext}`;
          versionedPath = path.join(productsDir, versionedFilename);
          version++;
        } while (fs.existsSync(versionedPath) && version < 1000); // Safety limit
        
        // Rename old file to versioned name
        fs.renameSync(correctPath, versionedPath);
        console.log(`Renamed old image to: ${path.basename(versionedPath)}`);
      } catch (err) {
        console.error("Error renaming old image:", err);
        // Continue anyway - we'll overwrite the old file
      }
    }

    // If filename doesn't match, rename the uploaded file to correct name
    if (file.filename !== correctFilename) {
      try {
        // Rename uploaded file to correct name
        fs.renameSync(file.path, correctPath);
      } catch (err) {
        console.error("Error renaming uploaded file:", err);
        // Delete uploaded file on error
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        }
        return res.status(500).json({
          message: "Failed to save image file",
        });
      }
    }

    // Update model with new image path
    const imagePath = `/products/${correctFilename}`;
    model.image = imagePath;
    await model.save();

    return res.json({
      message: "Product image uploaded successfully",
      imagePath,
      inverterModel: model,
    });
  } catch (error) {
    console.error("Upload Product Image Error:", error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
    
    return res.status(500).json({
      message: "Failed to upload product image",
    });
  }
};

/**
 * UPLOAD PRODUCT DATASHEET (PDF)
 *
 * URL:
 * POST /api/inverter-models/:id/upload-datasheet
 *
 * BODY:
 * FormData with 'datasheet' field and 'modelCode' field
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const uploadProductDatasheet = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const modelCode = req.body.modelCode;

    if (!file) {
      return res.status(400).json({
        message: "No PDF file provided",
      });
    }

    // Find the model
    const model = await InverterModel.findById(id);
    if (!model) {
      // Delete uploaded file if model not found
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error("Error deleting file:", err);
        }
      }
      return res.status(404).json({
        message: "Inverter model not found",
      });
    }

    // Get the modelCode from model if not provided in body
    const targetModelCode = modelCode || model.modelCode;
    
    // Generate the correct filename based on modelCode
    const normalizedCode = targetModelCode.toLowerCase().trim();
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const correctFilename = `${normalizedCode}${ext}`;
    const datasheetsDir = path.dirname(file.path);
    const correctPath = path.join(datasheetsDir, correctFilename);

    // Check if old datasheet exists and rename it with version suffix
    if (fs.existsSync(correctPath)) {
      try {
        // Find the next available version number
        let version = 1;
        let versionedPath;
        do {
          const versionedFilename = `${normalizedCode}-v${version}${ext}`;
          versionedPath = path.join(datasheetsDir, versionedFilename);
          version++;
        } while (fs.existsSync(versionedPath) && version < 1000); // Safety limit
        
        // Rename old file to versioned name
        fs.renameSync(correctPath, versionedPath);
        console.log(`Renamed old datasheet to: ${path.basename(versionedPath)}`);
      } catch (err) {
        console.error("Error renaming old datasheet:", err);
        // Continue anyway - we'll overwrite the old file
      }
    }

    // If filename doesn't match, rename the uploaded file to correct name
    if (file.filename !== correctFilename) {
      try {
        // Rename uploaded file to correct name
        fs.renameSync(file.path, correctPath);
      } catch (err) {
        console.error("Error renaming uploaded file:", err);
        // Delete uploaded file on error
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        }
        return res.status(500).json({
          message: "Failed to save datasheet file",
        });
      }
    }

    // Update model with new datasheet path
    const datasheetPath = `/products/datasheets/${correctFilename}`;
    model.datasheet = datasheetPath;
    await model.save();

    return res.json({
      message: "Product datasheet uploaded successfully",
      datasheetPath,
      inverterModel: model,
    });
  } catch (error) {
    console.error("Upload Product Datasheet Error:", error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
    
    return res.status(500).json({
      message: "Failed to upload product datasheet",
    });
  }
};