import ReplacedPart from "../models/ReplacedPart.js";
import ServiceJob from "../models/ServiceJob.js";
import InverterUnit from "../models/InverterUnit.js";
import PartDispatch from "../models/PartDispatch.js";

/**
 * Add a replaced / repaired part to an existing service job
 *
 * BUSINESS RULES ENFORCED:
 * 1. Replacement MUST come from a factory dispatch
 * 2. Dispatch MUST belong to the same service center
 * 3. Dispatch stock MUST be available
 * 4. Warranty window = 12 months from sale date
 * 5. Max 2 REPLACEMENT actions per part per inverter within warranty
 */
export const addReplacedPart = async (req, res) => {
  try {
    /* ---------------------------------------------------------
     * STEP 1: Read inputs
     * ------------------------------------------------------- */
    const { serviceJobId } = req.params;

    const {
      partCode,
      partName,
      quantity = 1,
      replacementDate,
      replacementType,
      dispatchId,
    } = req.body;

    /* ---------------------------------------------------------
     * STEP 2: Basic request validation
     * ------------------------------------------------------- */
    if (!partCode || !partName || !replacementDate || !dispatchId) {
      return res.status(400).json({
        message:
          "partCode, partName, replacementDate, and dispatchId are required",
      });
    }

    /* ---------------------------------------------------------
     * STEP 3: Load service job
     * ------------------------------------------------------- */
    const serviceJob = await ServiceJob.findById(serviceJobId);
    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found",
      });
    }

    /* ---------------------------------------------------------
     * STEP 4: Load inverter linked to service job
     * ------------------------------------------------------- */
    const inverterUnit = await InverterUnit.findById(serviceJob.inverterUnit);
    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter unit not found",
      });
    }

    /* ---------------------------------------------------------
     * STEP 5: Load factory dispatch
     * ------------------------------------------------------- */
    const dispatch = await PartDispatch.findById(dispatchId);
    if (!dispatch) {
      return res.status(404).json({
        message: "Dispatch not found",
      });
    }

    /* ---------------------------------------------------------
     * STEP 6: Ensure dispatch belongs to same service center
     * ------------------------------------------------------- */
    if (dispatch.serviceCenter !== serviceJob.serviceCenter) {
      return res.status(403).json({
        message:
          "Dispatch does not belong to this service center",
      });
    }

    /* ---------------------------------------------------------
     * STEP 7: Check available stock in dispatch
     * ------------------------------------------------------- */
    const dispatchedItem = dispatch.dispatchedItems.find(
      (item) => item.partCode === partCode
    );

    if (!dispatchedItem || dispatchedItem.quantity < quantity) {
      return res.status(403).json({
        message:
          "Insufficient dispatched stock for this part",
      });
    }

    /* ---------------------------------------------------------
     * STEP 8: Warranty window check (12 months from sale date)
     * ------------------------------------------------------- */
    const saleDate = new Date(inverterUnit.saleDate);
    const replacementDt = new Date(replacementDate);

    const monthsDifference =
      replacementDt.getFullYear() * 12 +
      replacementDt.getMonth() -
      (saleDate.getFullYear() * 12 + saleDate.getMonth());

    if (monthsDifference > 12) {
      return res.status(403).json({
        message:
          "Replacement not allowed: warranty period expired",
      });
    }

    /* ---------------------------------------------------------
     * STEP 9: Enforce max 2 replacements per part per inverter
     * ------------------------------------------------------- */
    const previousReplacementsCount =
      await ReplacedPart.countDocuments({
        inverterUnit: inverterUnit._id,
        partCode,
        replacementType: "REPLACEMENT",
      });

    if (previousReplacementsCount >= 2) {
      return res.status(403).json({
        message:
          "Replacement limit exceeded for this part under warranty",
      });
    }

    /* ---------------------------------------------------------
     * STEP 10: Deduct stock from dispatch
     * ------------------------------------------------------- */
    dispatchedItem.quantity -= quantity;
    await dispatch.save();

    /* ---------------------------------------------------------
     * STEP 11: Create replaced part record
     * ------------------------------------------------------- */
    const replacedPart = await ReplacedPart.create({
      serviceJob: serviceJob._id,
      inverterUnit: inverterUnit._id,
      dispatch: dispatch._id, // 🔗 audit link
      partCode,
      partName,
      quantity,
      replacementDate,
      replacementType: replacementType || "REPLACEMENT",
    });

    /* ---------------------------------------------------------
     * STEP 12: Response
     * ------------------------------------------------------- */
    return res.status(201).json({
      message: "Replaced part added successfully",
      replacedPart,
    });
  } catch (error) {
    console.error("Add Replaced Part Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};