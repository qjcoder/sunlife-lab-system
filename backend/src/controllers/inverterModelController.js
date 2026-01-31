import InverterModel from "../models/InverterModel.js";

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
    const inverterModel = await InverterModel.create({
      brand,
      productLine,
      variant,
      modelCode,
      warranty,
      active: true, // required for listing
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
    const models = await InverterModel.find({ active: true })
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