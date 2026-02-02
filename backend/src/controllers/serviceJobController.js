import mongoose from "mongoose";
import InverterUnit from "../models/InverterUnit.js";
import ServiceJob from "../models/ServiceJob.js";
import ReplacedPart from "../models/ReplacedPart.js";
import { calculateWarrantyStatus } from "../services/warrantyService.js";

/**
 * ====================================================
 * CREATE SERVICE JOB
 * ====================================================
 *
 * RULES:
 * - Inverter MUST be sold
 * - Warranty is SNAPSHOTTED at visitDate
 * - Service center identity is SYSTEM controlled
 *
 * ACCESS:
 * - SERVICE_CENTER only
 */
export const createServiceJob = async (req, res) => {
  try {
    const { serialNumber, reportedFault, visitDate, remarks } = req.body;

    /* --------------------------------------------------
     * 1️⃣ Validate input
     * -------------------------------------------------- */
    if (!serialNumber || !reportedFault || !visitDate) {
      return res.status(400).json({
        message: "serialNumber, reportedFault, and visitDate are required",
      });
    }

    /* --------------------------------------------------
     * 2️⃣ Load inverter (authoritative)
     * -------------------------------------------------- */
    const inverterUnit = await InverterUnit.findOne({ serialNumber })
      .populate("inverterModel")
      .lean();

    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter not found for given serial number",
      });
    }

    /* --------------------------------------------------
     * 3️⃣ HARD BLOCK — must be SOLD
     * -------------------------------------------------- */
    if (!inverterUnit.saleDate) {
      return res.status(403).json({
        message: "Service job cannot be created before inverter sale",
      });
    }

    /* --------------------------------------------------
     * 4️⃣ WARRANTY SNAPSHOT (at visit date)
     * -------------------------------------------------- */
    const warrantyStatus = calculateWarrantyStatus(
      inverterUnit.saleDate,
      inverterUnit.inverterModel.warranty,
      visitDate
    );

    const serviceType =
      warrantyStatus.parts === true ? "FREE" : "PAID";

    /* --------------------------------------------------
     * 5️⃣ Create service job (IMMUTABLE FACT)
     * -------------------------------------------------- */
    const serviceJob = await ServiceJob.create({
      inverterUnit: inverterUnit._id,
      serialNumber: inverterUnit.serialNumber,

      serviceCenter: req.user.name, // 🔒 authoritative
      reportedFault,
      visitDate: new Date(visitDate),
      remarks: remarks || null,

      warrantyStatus, // snapshot
      serviceType,    // derived

      createdBy: req.user.userId,
      roleAtCreation: req.user.role,
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
 * ====================================================
 * LIST SERVICE JOBS
 * ====================================================
 */
export const listServiceJobs = async (req, res) => {
  try {
    const { fromDate, toDate, serviceCenter, warranty, serialNumber } = req.query;
    const query = {};

    /* --------------------------------------------------
     * Role-based visibility
     * -------------------------------------------------- */
    if (req.user.role === "SERVICE_CENTER") {
      query.serviceCenter = req.user.name;
    }

    if (serviceCenter && req.user.role === "FACTORY_ADMIN") {
      query.serviceCenter = serviceCenter;
    }

    /* --------------------------------------------------
     * Date filters
     * -------------------------------------------------- */
    if (fromDate || toDate) {
      query.visitDate = {};
      if (fromDate) query.visitDate.$gte = new Date(fromDate);
      if (toDate) query.visitDate.$lte = new Date(toDate);
    }

    /* --------------------------------------------------
     * Warranty filter
     * -------------------------------------------------- */
    if (warranty === "in") query["warrantyStatus.parts"] = true;
    if (warranty === "out") query["warrantyStatus.parts"] = false;

    /* --------------------------------------------------
     * Serial filter
     * -------------------------------------------------- */
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
 * ====================================================
 * SERVICE JOB DETAILS
 * ====================================================
 */
export const getServiceJobDetails = async (req, res) => {
  try {
    const { serviceJobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceJobId)) {
      return res.status(400).json({ message: "Invalid service job ID" });
    }

    const query = { _id: serviceJobId };

    if (req.user.role === "SERVICE_CENTER") {
      query.serviceCenter = req.user.name;
    }

    const serviceJob = await ServiceJob.findOne(query)
      .populate({
        path: "inverterUnit",
        populate: { path: "inverterModel" },
      })
      .lean();

    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found or access denied",
      });
    }

    const replacedParts = await ReplacedPart.find({
      serviceJob: serviceJob._id,
    }).lean();

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