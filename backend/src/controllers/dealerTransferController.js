import InverterUnit from "../models/InverterUnit.js";
import User from "../models/User.js";

/**
 * ====================================================
 * DEALER → SUB-DEALER INVERTER TRANSFER (Single + Bulk)
 * ====================================================
 *
 * RULES:
 * - Ownership transfer ONLY (NO warranty start)
 * - Dealer must own inverter
 * - Sub-dealer must belong to dealer
 * - Fail ENTIRE request if ANY serial is invalid
 */
export const transferToSubDealer = async (req, res) => {
  try {
    const { subDealerId, serialNumbers } = req.body;

    /* --------------------------------------------------
     * 1️⃣ Validate input
     * -------------------------------------------------- */
    if (
      !subDealerId ||
      !Array.isArray(serialNumbers) ||
      serialNumbers.length === 0
    ) {
      return res.status(400).json({
        message: "subDealerId and serialNumbers[] are required",
      });
    }

    /* --------------------------------------------------
     * 2️⃣ Validate sub-dealer ownership
     * -------------------------------------------------- */
    const subDealer = await User.findById(subDealerId);

    if (
      !subDealer ||
      subDealer.role !== "SUB_DEALER" ||
      !subDealer.parentDealer ||
      !subDealer.parentDealer.equals(req.user.userId) // ✅ FIX
    ) {
      return res.status(403).json({
        message: "Invalid sub-dealer or not under your account",
      });
    }

    /* --------------------------------------------------
     * 3️⃣ Load inverter units
     * -------------------------------------------------- */
    const inverters = await InverterUnit.find({
      serialNumber: { $in: serialNumbers },
    });

    const foundSerials = inverters.map(i => i.serialNumber);
    const missing = serialNumbers.filter(
      s => !foundSerials.includes(s)
    );

    if (missing.length > 0) {
      return res.status(404).json({
        message: "Invalid serial in request",
        missingSerials: missing,
      });
    }

    /* --------------------------------------------------
     * 4️⃣ HARD STOCK GUARDS
     * -------------------------------------------------- */
    for (const inverter of inverters) {
      if (!inverter.dealer) {
        return res.status(403).json({
          message: "Invalid serial in request",
          serialNumber: inverter.serialNumber,
          reason: "NOT_DISPATCHED",
        });
      }

      if (inverter.dealer !== req.user.name) {
        return res.status(403).json({
          message: "Invalid serial in request",
          serialNumber: inverter.serialNumber,
          reason: "NOT_OWNED",
        });
      }

      if (inverter.saleDate) {
        return res.status(409).json({
          message: "Invalid serial in request",
          serialNumber: inverter.serialNumber,
          reason: "ALREADY_SOLD",
        });
      }
    }

    /* --------------------------------------------------
     * 5️⃣ Transfer ownership
     * -------------------------------------------------- */
    await InverterUnit.updateMany(
      { serialNumber: { $in: serialNumbers } },
      { dealer: subDealer.name } // ownership moves
    );

    return res.status(200).json({
      message: "Transfer to sub-dealer completed successfully",
      subDealer: {
        id: subDealer._id,
        name: subDealer.name,
      },
      transferredCount: serialNumbers.length,
    });
  } catch (error) {
    console.error("Dealer → Sub-Dealer Transfer Error:", error);
    return res.status(500).json({
      message: "Failed to transfer inverters",
    });
  }
};