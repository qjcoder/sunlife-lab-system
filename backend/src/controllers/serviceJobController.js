import InverterUnit from "../models/InverterUnit.js";
import ServiceJob from "../models/ServiceJob.js";
import { calculateWarrantyStatus } from "../services/warrantyService.js";

/**
 * Create a new service job (diagnostics / visit)
 * No parts replaced at this stage
 */
export const createServiceJob = async (req, res) => {
  try {
    const { serialNumber, serviceCenter, reportedFault, visitDate } = req.body;

    if (!serialNumber || !serviceCenter || !visitDate) {
      return res.status(400).json({
        message: "serialNumber, serviceCenter, and visitDate are required"
      });
    }

    // 1️⃣ Find inverter by serial number
    const inverterUnit = await InverterUnit.findOne({ serialNumber })
      .populate("inverterModel");

    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter not found for given serial number"
      });
    }

    // 2️⃣ Calculate warranty snapshot
    const warrantyStatus = calculateWarrantyStatus(
      inverterUnit.saleDate,
      inverterUnit.inverterModel.warranty,
      visitDate
    );

    // 3️⃣ Create service job
    const serviceJob = await ServiceJob.create({
      inverterUnit: inverterUnit._id,
      serviceCenter,
      reportedFault,
      visitDate,
      warrantyStatus
    });

    return res.status(201).json({
      message: "Service job created successfully",
      serviceJob
    });
  } catch (error) {
    console.error("Create Service Job Error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};