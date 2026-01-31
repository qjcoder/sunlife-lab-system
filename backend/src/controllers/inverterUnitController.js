import InverterUnit from "../models/InverterUnit.js";
import InverterModel from "../models/InverterModel.js";

/**
 * CREATE INVERTER UNIT (Factory Registration)
 *
 * Purpose:
 * - Register a physical inverter unit coming out of factory
 * - Unit is identified ONLY by unique serialNumber
 * - Unit is linked to a pre-created inverter model (brand / product line / variant)
 *
 * Who can call:
 * - FACTORY_ADMIN only
 *
 * URL:
 * POST /api/inverters
 *
 * Body:
 * {
 *   "serialNumber": "92339394949",
 *   "inverterModel": "<MODEL_ID>"
 * }
 */
export const createInverterUnit = async (req, res) => {
  try {
    const { serialNumber, inverterModel } = req.body;

    /**
     * 1️⃣ Basic validation
     */
    if (!serialNumber || !inverterModel) {
      return res.status(400).json({
        message: "serialNumber and inverterModel are required",
      });
    }

    /**
     * 2️⃣ Ensure serial number is unique
     * - One physical unit = one serial number
     */
    const existingUnit = await InverterUnit.findOne({ serialNumber });
    if (existingUnit) {
      return res.status(409).json({
        message: "Inverter unit with this serial number already exists",
      });
    }

    /**
     * 3️⃣ Validate inverter model
     * - Model must already exist (created once by factory)
     */
    const model = await InverterModel.findById(inverterModel);
    if (!model) {
      return res.status(404).json({
        message: "Invalid inverter model",
      });
    }

    /**
     * 4️⃣ Create inverter unit
     * - Sale & customer fields remain NULL at factory stage
     */
    const inverterUnit = await InverterUnit.create({
      serialNumber,
      inverterModel: model._id,
    });

    /**
     * 5️⃣ Return populated response
     * - Shows clearly which model & variant this unit belongs to
     */
    const populatedUnit = await InverterUnit.findById(inverterUnit._id)
      .populate(
        "inverterModel",
        "brand productLine variant modelCode"
      )
      .lean();

    return res.status(201).json({
      message: "Inverter unit registered successfully",
      inverterUnit: populatedUnit,
    });
  } catch (error) {
    console.error("Create Inverter Unit Error:", error);
    return res.status(500).json({
      message: "Failed to register inverter unit",
    });
  }
};