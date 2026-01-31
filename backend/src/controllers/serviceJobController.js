import mongoose from "mongoose";
import InverterUnit from "../models/InverterUnit.js";
import ServiceJob from "../models/ServiceJob.js";
import ReplacedPart from "../models/ReplacedPart.js";
import { calculateWarrantyStatus } from "../services/warrantyService.js";

/**
 * CREATE SERVICE JOB
 *
 * - Represents one service visit
 * - Warranty is SNAPSHOTTED at visitDate
 *
 * ACCESS:
 * SERVICE_CENTER only
 */
export const createServiceJob = async (req, res) => {
  try {
    const { serialNumber, serviceCenter, reportedFault, visitDate } = req.body;

    // 1️⃣ Validate input
    if (!serialNumber || !serviceCenter || !visitDate) {
      return res.status(400).json({
        message: "serialNumber, serviceCenter, and visitDate are required",
      });
    }

    // 2️⃣ Find inverter by serial number
    const inverterUnit = await InverterUnit.findOne({ serialNumber })
      .populate("inverterModel");

    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter not found for given serial number",
      });
    }

    // ❗ 3️⃣ Prevent service before sale
    if (!inverterUnit.saleDate) {
      return res.status(403).json({
        message: "Service job cannot be created before inverter sale",
      });
    }

    // 4️⃣ Calculate warranty snapshot at visit date
    const warrantyStatus = calculateWarrantyStatus(
      inverterUnit.saleDate,
      inverterUnit.inverterModel.warranty,
      visitDate
    );

    // 5️⃣ Create service job
    const serviceJob = await ServiceJob.create({
      inverterUnit: inverterUnit._id,
      serviceCenter,
      reportedFault,
      visitDate,
      warrantyStatus,
      createdBy: req.user.userId, // 🔐 audit trail
    });

    return res.status(201).json({
      message: "Service job created successfully",
      serviceJob,
    });
  } catch (error) {
    console.error("Create Service Job Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * LIST SERVICE JOBS (D1)
 *
 * Filters:
 * - date range
 * - service center
 * - warranty status
 * - inverter serial number
 */
export const listServiceJobs = async (req, res) => {
  try {
    const { fromDate, toDate, serviceCenter, warranty, serialNumber } = req.query;
    const query = {};

    // 🔐 Role-based visibility
    if (req.user.role === "SERVICE_CENTER") {
      query.serviceCenter = req.user.name;
    }

    // Factory admin filter
    if (serviceCenter && req.user.role === "FACTORY_ADMIN") {
      query.serviceCenter = serviceCenter;
    }

    // Date range
    if (fromDate || toDate) {
      query.visitDate = {};
      if (fromDate) query.visitDate.$gte = new Date(fromDate);
      if (toDate) query.visitDate.$lte = new Date(toDate);
    }

    // Warranty filter
    if (warranty === "in") query["warrantyStatus.parts"] = true;
    if (warranty === "out") query["warrantyStatus.parts"] = false;

    // Serial number filter
    if (serialNumber) {
      const inverter = await InverterUnit.findOne({ serialNumber });
      if (!inverter) return res.json({ count: 0, data: [] });
      query.inverterUnit = inverter._id;
    }

    const jobs = await ServiceJob.find(query)
      .sort({ visitDate: -1 })
      .populate("inverterUnit", "serialNumber inverterModel")
      .lean();

    return res.json({
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error("List Service Jobs Error:", error);
    return res.status(500).json({
      message: "Failed to list service jobs",
    });
  }
};

/**
 * SERVICE JOB DETAILS (D2)
 *
 * Returns:
 * - Service job
 * - Inverter + model
 * - Replaced parts
 */
export const getServiceJobDetails = async (req, res) => {
  try {
    const { serviceJobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceJobId)) {
      return res.status(400).json({ message: "Invalid service job ID" });
    }

    const query = { _id: serviceJobId };

    // 🔐 Restrict service center access
    if (req.user.role === "SERVICE_CENTER") {
      query.serviceCenter = req.user.name;
    }

    const serviceJob = await ServiceJob.findOne(query)
      .populate({
        path: "inverterUnit",
        populate: { path: "inverterModel" },
      });

    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found or access denied",
      });
    }

    const replacedParts = await ReplacedPart.find({
      serviceJob: serviceJob._id,
    });

    return res.json({
      serviceJob,
      replacedParts,
    });
  } catch (error) {
    console.error("Get Service Job Details Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};