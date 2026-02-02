import mongoose from "mongoose";
import ReplacedPart from "../models/ReplacedPart.js";
import ServiceJob from "../models/ServiceJob.js";
import InverterUnit from "../models/InverterUnit.js";
import PartDispatch from "../models/PartDispatch.js";

export const addReplacedPart = async (req, res) => {
  try {
    const { serviceJobId } = req.params;
    const {
      partCode,
      partName,
      quantity = 1,
      replacementDate,
      replacementType = "REPLACEMENT",
      dispatchId,
    } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!partCode || !partName || !replacementDate || !dispatchId) {
      return res.status(400).json({
        message: "partCode, partName, replacementDate, dispatchId required",
      });
    }

    /* ---------------- SERVICE JOB ---------------- */
    const serviceJob = await ServiceJob.findById(serviceJobId);
    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found",
      });
    }

    /* ---------------- INVERTER ---------------- */
    const inverterUnit = await InverterUnit.findById(serviceJob.inverterUnit);
    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter unit not found",
      });
    }

    // Validate dispatchId format
if (!mongoose.Types.ObjectId.isValid(dispatchId)) {
  return res.status(400).json({
    message: "Invalid dispatchId format",
  });
}

    /* ---------------- DISPATCH ---------------- */
    const dispatch = await PartDispatch.findById(dispatchId);
    if (!dispatch) {
      return res.status(404).json({
        message: "Dispatch not found",
      });
    }

    // Ownership check
    if (dispatch.serviceCenter !== serviceJob.serviceCenter) {
      return res.status(403).json({
        message: "Dispatch does not belong to this service center",
      });
    }

    /* ---------------- STOCK CHECK ---------------- */
    const item = dispatch.dispatchedItems.find(
      (i) => i.partCode === partCode
    );

    if (!item || item.quantity < quantity) {
      return res.status(403).json({
        message: "Insufficient dispatched stock",
      });
    }

    /* ---------------- WARRANTY CHECK ---------------- */
    if (replacementType === "REPLACEMENT") {
      if (!inverterUnit.saleDate) {
        return res.status(403).json({
          message: "Inverter not sold yet",
        });
      }

      const sale = new Date(inverterUnit.saleDate);
      const rep = new Date(replacementDate);

      const months =
        rep.getFullYear() * 12 +
        rep.getMonth() -
        (sale.getFullYear() * 12 + sale.getMonth());

      if (months > 12) {
        return res.status(403).json({
          message: "Warranty expired",
        });
      }
    }

    /* ---------------- DEDUCT STOCK ---------------- */
    item.quantity -= quantity;
    await dispatch.save();

    /* ---------------- CREATE RECORD ---------------- */
    const replacedPart = await ReplacedPart.create({
      serviceJob: serviceJob._id,
      inverterUnit: inverterUnit._id,
      dispatch: dispatch._id, // ✅ FIXED
      partCode,
      partName,
      quantity,
      replacementDate,
      replacementType,
    });

    return res.status(201).json({
      message: "Replaced part added successfully",
      replacedPart,
    });
  } catch (err) {
    console.error("Add Replaced Part Error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};