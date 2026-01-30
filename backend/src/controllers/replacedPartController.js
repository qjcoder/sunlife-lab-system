import ReplacedPart from "../models/ReplacedPart.js";
import ServiceJob from "../models/ServiceJob.js";
import InverterUnit from "../models/InverterUnit.js";

/**
 * Add replaced part to an existing service job
 * ENFORCES:
 * - Max 2 replacements per part within 1 year from sale date
 */
export const addReplacedPart = async (req, res) => {
  try {
    const { serviceJobId } = req.params;
    const {
      partCode,
      partName,
      quantity,
      replacementDate,
      replacementType,
    } = req.body;

    // 1️⃣ Basic validation
    if (!partCode || !partName || !replacementDate) {
      return res.status(400).json({
        message: "partCode, partName, and replacementDate are required",
      });
    }

    // 2️⃣ Find service job
    const serviceJob = await ServiceJob.findById(serviceJobId);
    if (!serviceJob) {
      return res.status(404).json({
        message: "Service job not found",
      });
    }

    // 3️⃣ Load inverter unit
    const inverterUnit = await InverterUnit.findById(serviceJob.inverterUnit);
    if (!inverterUnit) {
      return res.status(404).json({
        message: "Inverter unit not found",
      });
    }

    // 4️⃣ Warranty window check (1 year from sale date)
    const saleDate = new Date(inverterUnit.saleDate);
    const replacementDt = new Date(replacementDate);

    const monthsBetween =
      replacementDt.getFullYear() * 12 +
      replacementDt.getMonth() -
      (saleDate.getFullYear() * 12 + saleDate.getMonth());

    if (monthsBetween > 12) {
      return res.status(403).json({
        message: "Part replacement not allowed: warranty period expired",
      });
    }

    // 5️⃣ Count previous replacements for same part
    const previousReplacementsCount = await ReplacedPart.countDocuments({
      inverterUnit: inverterUnit._id,
      partCode,
      replacementType: "REPLACEMENT",
    });

    if (previousReplacementsCount >= 2) {
      return res.status(403).json({
        message:
          "Replacement limit exceeded: part already replaced maximum times under warranty",
      });
    }

    // 6️⃣ Create replaced part
    const replacedPart = await ReplacedPart.create({
      serviceJob: serviceJob._id,
      inverterUnit: inverterUnit._id,
      partCode,
      partName,
      quantity: quantity || 1,
      replacementDate,
      replacementType: replacementType || "REPLACEMENT",
    });

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