import InverterUnit from "../models/InverterUnit.js";
import InverterModel from "../models/InverterModel.js";
import User from "../models/User.js";

/**
 * ====================================================
 * OPERATOR SERIAL ENTRY CONTROLLER
 * ====================================================
 * 
 * This controller handles serial number entry by data entry operators.
 * 
 * FEATURES:
 * - Single and bulk serial entry
 * - Duplicate detection with operator details
 * - History tracking per model
 * 
 * ROLES:
 * - DATA_ENTRY_OPERATOR: Can enter serial numbers
 */

/**
 * SINGLE SERIAL ENTRY
 * POST /api/operator/serial-entry/single
 */
export const createSingleSerialEntry = async (req, res) => {
  try {
    const { serialNumber, inverterModel, manufacturingDate } = req.body;
    const operatorId = req.user.userId || req.user._id;

    if (!serialNumber || !inverterModel) {
      return res.status(400).json({
        message: "serialNumber and inverterModel are required",
      });
    }

    // Check if serial already exists
    const existing = await InverterUnit.findOne({ serialNumber: serialNumber.trim() })
      .populate('enteredBy', 'name email')
      .lean();

    if (existing) {
      // Get operator details who entered it
      const operator = existing.enteredBy 
        ? { name: existing.enteredBy.name, email: existing.enteredBy.email }
        : { name: 'System', email: 'system@sunlife.com' };

      return res.status(409).json({
        message: "Serial number already exists",
        duplicate: true,
        existingSerial: {
          serialNumber: existing.serialNumber,
          enteredBy: operator.name,
          enteredAt: existing.createdAt,
          enteredDate: existing.createdAt.toISOString().split('T')[0],
          enteredTime: existing.createdAt.toTimeString().split(' ')[0],
        },
      });
    }

    // Validate model
    const model = await InverterModel.findById(inverterModel);
    if (!model) {
      return res.status(404).json({
        message: "Invalid inverter model",
      });
    }

    // Create unit
    const unit = await InverterUnit.create({
      serialNumber: serialNumber.trim(),
      inverterModel: model._id,
      enteredBy: operatorId,
      ...(manufacturingDate && { createdAt: new Date(manufacturingDate) }),
    });

    return res.status(201).json({
      message: "Serial number entered successfully",
      inverterUnit: unit,
    });
  } catch (error) {
    console.error("Create Single Serial Entry Error:", error);
    return res.status(500).json({
      message: "Failed to enter serial number",
    });
  }
};

/**
 * BULK SERIAL ENTRY
 * POST /api/operator/serial-entry/bulk
 */
export const createBulkSerialEntry = async (req, res) => {
  try {
    const { inverterModel, serialNumbers, manufacturingDate } = req.body;
    const operatorId = req.user.userId || req.user._id;

    if (!inverterModel || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return res.status(400).json({
        message: "inverterModel and serialNumbers array are required",
      });
    }

    // Validate model
    const model = await InverterModel.findById(inverterModel);
    if (!model) {
      return res.status(404).json({
        message: "Invalid inverter model",
      });
    }

    // Normalize serials
    const cleanSerials = serialNumbers
      .map(sn => sn.trim())
      .filter(sn => sn.length > 0);

    if (cleanSerials.length === 0) {
      return res.status(400).json({
        message: "No valid serial numbers provided",
      });
    }

    // Detect duplicates within request
    const requestDuplicates = [];
    const uniqueSerials = [];
    const seenInRequest = new Set();

    cleanSerials.forEach(sn => {
      if (seenInRequest.has(sn)) {
        requestDuplicates.push(sn);
      } else {
        seenInRequest.add(sn);
        uniqueSerials.push(sn);
      }
    });

    // Check existing serials in database
    const existing = await InverterUnit.find({
      serialNumber: { $in: uniqueSerials },
    })
      .populate('enteredBy', 'name email')
      .lean();

    const existingSerials = new Set(existing.map(u => u.serialNumber));
    const accepted = [];
    const rejected = [];

    // Categorize serials
    uniqueSerials.forEach(sn => {
      if (requestDuplicates.includes(sn)) {
        rejected.push({
          serialNumber: sn,
          reason: 'DUPLICATE_IN_REQUEST',
          message: 'Duplicate in current request',
        });
      } else if (existingSerials.has(sn)) {
        const existingUnit = existing.find(u => u.serialNumber === sn);
        const operator = existingUnit.enteredBy 
          ? { name: existingUnit.enteredBy.name, email: existingUnit.enteredBy.email }
          : { name: 'System', email: 'system@sunlife.com' };

        rejected.push({
          serialNumber: sn,
          reason: 'ALREADY_EXISTS',
          message: 'Serial number already exists',
          enteredBy: operator.name,
          enteredAt: existingUnit.createdAt,
          enteredDate: existingUnit.createdAt.toISOString().split('T')[0],
          enteredTime: existingUnit.createdAt.toTimeString().split(' ')[0],
        });
      } else {
        accepted.push(sn);
      }
    });

    // Create accepted serials
    const created = [];
    if (accepted.length > 0) {
      const payload = accepted.map(sn => ({
        serialNumber: sn,
        inverterModel: model._id,
        enteredBy: operatorId,
        ...(manufacturingDate && { createdAt: new Date(manufacturingDate) }),
      }));

      const createdUnits = await InverterUnit.insertMany(payload);
      created.push(...createdUnits);
    }

    return res.status(201).json({
      message: "Bulk serial entry completed",
      summary: {
        total: cleanSerials.length,
        accepted: accepted.length,
        rejected: rejected.length,
      },
      accepted: accepted,
      rejected: rejected,
      createdCount: created.length,
    });
  } catch (error) {
    console.error("Create Bulk Serial Entry Error:", error);
    return res.status(500).json({
      message: "Failed to process bulk serial entry",
    });
  }
};

/**
 * GET SERIAL ENTRY HISTORY BY MODEL
 * GET /api/operator/serial-entry/history?modelId=xxx
 */
export const getSerialEntryHistory = async (req, res) => {
  try {
    const { modelId } = req.query;

    if (!modelId) {
      return res.status(400).json({
        message: "modelId is required",
      });
    }

    // Get all units for this model, populated with operator info
    const units = await InverterUnit.find({ inverterModel: modelId })
      .populate('enteredBy', 'name email')
      .populate('inverterModel', 'modelName modelCode')
      .sort({ createdAt: -1 })
      .lean();

    // Group by date
    const historyByDate = {};
    
    units.forEach(unit => {
      const dateKey = unit.createdAt.toISOString().split('T')[0];
      if (!historyByDate[dateKey]) {
        historyByDate[dateKey] = [];
      }

      const operator = unit.enteredBy 
        ? { name: unit.enteredBy.name, email: unit.enteredBy.email }
        : { name: 'System', email: 'system@sunlife.com' };

      historyByDate[dateKey].push({
        serialNumber: unit.serialNumber,
        enteredBy: operator.name,
        enteredAt: unit.createdAt,
        enteredTime: unit.createdAt.toTimeString().split(' ')[0],
      });
    });

    // Convert to array format
    const history = Object.entries(historyByDate)
      .map(([date, entries]) => ({
        date,
        count: entries.length,
        entries: entries.sort((a, b) => 
          new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      modelId,
      totalEntries: units.length,
      history,
    });
  } catch (error) {
    console.error("Get Serial Entry History Error:", error);
    return res.status(500).json({
      message: "Failed to fetch serial entry history",
    });
  }
};
