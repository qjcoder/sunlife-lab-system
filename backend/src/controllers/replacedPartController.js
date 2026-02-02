import mongoose from "mongoose";
import ReplacedPart from "../models/ReplacedPart.js";
import ServiceJob from "../models/ServiceJob.js";
import InverterUnit from "../models/InverterUnit.js";
import PartDispatch from "../models/PartDispatch.js";

/**
 * ====================================================
 * ADD REPLACED / REPAIRED PART
 * ====================================================
 *
 * CORE ENFORCEMENT:
 * - Stock must exist
 * - Dispatch must belong to service center
 * - Warranty rules auto-derived
 * - Cost liability auto-derived
 *
 * ACCESS:
 * SERVICE_CENTER only
 */
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

    /* --------------------------------------------------
     * 1️⃣ Basic validation
     * -------------------------------------------------- */
    if (!partCode || !partName || !replacementDate || !dispatchId) {
      return res.status(400).json({
        message:
          "partCode, partName, replacementDate, and dispatchId are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(dispatchId)) {
      return res.status(400).json({
        message: "Invalid dispatchId format",
      });
    }

    /* --------------------------------------------------
     * 2️⃣ Load service job
     * -------------------------------------------------- */
    const serviceJob = await ServiceJob.findById(serviceJobId);
    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found",
      });
    }

    /* --------------------------------------------------
     * 3️⃣ Load inverter unit
     * -------------------------------------------------- */
    const inverterUnit = await InverterUnit.findById(
      serviceJob.inverterUnit
    ).populate("inverterModel");

    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter unit not found",
      });
    }

    /* --------------------------------------------------
     * 4️⃣ Prevent replacement before sale
     * -------------------------------------------------- */
    if (!inverterUnit.saleDate && replacementType === "REPLACEMENT") {
      return res.status(403).json({
        message: "Replacement not allowed before inverter sale",
      });
    }

    /* --------------------------------------------------
     * 5️⃣ Load factory dispatch
     * -------------------------------------------------- */
    const dispatch = await PartDispatch.findById(dispatchId);
    if (!dispatch) {
      return res.status(404).json({
        message: "Dispatch not found",
      });
    }

    if (dispatch.serviceCenter !== serviceJob.serviceCenter) {
      return res.status(403).json({
        message: "Dispatch does not belong to this service center",
      });
    }

    /* --------------------------------------------------
     * 6️⃣ Stock validation
     * -------------------------------------------------- */
    const dispatchedItem = dispatch.dispatchedItems.find(
      (i) => i.partCode === partCode
    );

    if (!dispatchedItem || dispatchedItem.quantity < quantity) {
      return res.status(403).json({
        message: "Insufficient dispatched stock for this part",
      });
    }

    /* --------------------------------------------------
     * 7️⃣ WARRANTY & COST LIABILITY DERIVATION
     * -------------------------------------------------- */
    let costLiability = "CUSTOMER";
    let warrantyClaimEligible = false;

    if (replacementType === "REPLACEMENT") {
      const saleDate = new Date(inverterUnit.saleDate);
      const repDate = new Date(replacementDate);

      const warrantyMonths =
        inverterUnit.inverterModel.warranty?.partsMonths || 0;

      const warrantyEnd = new Date(saleDate);
      warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths);

      if (repDate <= warrantyEnd) {
        costLiability = "FACTORY";
        warrantyClaimEligible = true;
      }
    }

    /* --------------------------------------------------
     * 8️⃣ Deduct stock (ONLY for replacement)
     * -------------------------------------------------- */
    if (replacementType === "REPLACEMENT") {
      dispatchedItem.quantity -= quantity;
      await dispatch.save();
    }

    /* --------------------------------------------------
     * 9️⃣ Create replaced part record
     * -------------------------------------------------- */
    const replacedPart = await ReplacedPart.create({
      serviceJob: serviceJob._id,
      inverterUnit: inverterUnit._id,
      dispatch: dispatch._id,
      partCode,
      partName,
      quantity,
      replacementDate,
      replacementType,
      costLiability,
      warrantyClaimEligible,
    });

    /* --------------------------------------------------
     * 🔟 Response
     * -------------------------------------------------- */
    return res.status(201).json({
      message: "Replaced part recorded successfully",
      replacedPart,
    });
  } catch (error) {
    console.error("Add Replaced Part Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};