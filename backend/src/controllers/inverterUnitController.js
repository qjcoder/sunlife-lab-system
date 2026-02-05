import InverterUnit from "../models/InverterUnit.js";
import InverterModel from "../models/InverterModel.js";

/**
 * ====================================================
 * INVERTER UNIT CONTROLLER
 * ====================================================
 * 
 * This controller handles physical inverter unit operations.
 * 
 * WORKFLOW:
 * 1. Factory registers inverter units with serial numbers
 * 2. Units can be registered individually or in bulk
 * 3. Each unit is linked to an inverter model
 * 
 * BUSINESS RULES:
 * - Serial numbers must be unique
 * - Units must reference a valid inverter model
 * - Bulk operations validate all serials before creating any
 * 
 * ROLES:
 * - FACTORY_ADMIN: Can register inverter units (single or bulk)
 */
export const createInverterUnit = async (req, res) => {
  try {
    const { serialNumber, inverterModel } = req.body;

    if (!serialNumber || !inverterModel) {
      return res.status(400).json({
        message: "serialNumber and inverterModel are required",
      });
    }

    const exists = await InverterUnit.findOne({ serialNumber });
    if (exists) {
      return res.status(409).json({
        message: "Inverter unit with this serial number already exists",
      });
    }

    const model = await InverterModel.findById(inverterModel);
    if (!model) {
      return res.status(404).json({
        message: "Invalid inverter model",
      });
    }

    const unit = await InverterUnit.create({
      serialNumber: serialNumber.trim(),
      inverterModel: model._id,
    });

    return res.status(201).json({
      message: "Inverter unit registered successfully",
      inverterUnit: unit,
    });
  } catch (error) {
    console.error("Create Inverter Unit Error:", error);
    return res.status(500).json({
      message: "Failed to register inverter unit",
    });
  }
};

/**
 * ====================================================
 * BULK CREATE INVERTER UNITS (EXCEL / QR / ERP)
 * ====================================================
 * POST /api/inverters/bulk
 *
 * Body:
 * {
 *   "modelCode": "SL-INFINT-6KW",
 *   "serialNumbers": ["SN-001", "SN-002"]
 * }
 */
export const bulkCreateInverterUnits = async (req, res) => {
  try {
    const { modelCode, serialNumbers } = req.body;

    if (!modelCode || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return res.status(400).json({
        message: "modelCode and serialNumbers are required",
      });
    }

    // 1️⃣ Validate model by modelCode
    const model = await InverterModel.findOne({ modelCode });
    if (!model) {
      return res.status(404).json({
        message: "Invalid modelCode",
      });
    }

    // 2️⃣ Normalize serials
    const cleanSerials = serialNumbers.map(sn => sn.trim());

    // 3️⃣ Detect duplicates in request
    if (new Set(cleanSerials).size !== cleanSerials.length) {
      return res.status(409).json({
        message: "Duplicate serial numbers in request",
      });
    }

    // 4️⃣ Detect duplicates in DB
    const existing = await InverterUnit.find({
      serialNumber: { $in: cleanSerials },
    });

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Some serial numbers already exist",
        existingSerials: existing.map(u => u.serialNumber),
      });
    }

    // 5️⃣ Bulk insert
    const payload = cleanSerials.map(sn => ({
      serialNumber: sn,
      inverterModel: model._id,
    }));

    const created = await InverterUnit.insertMany(payload);

    return res.status(201).json({
      message: "Bulk inverter units registered successfully",
      modelCode,
      createdCount: created.length,
    });
  } catch (error) {
    console.error("Bulk Create Inverter Units Error:", error);
    return res.status(500).json({
      message: "Failed to bulk register inverter units",
    });
  }
};