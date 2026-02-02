import InverterUnit from "../models/InverterUnit.js";
import User from "../models/User.js";
import DealerTransfer from "../models/DealerTransfer.js";

/**
 * ====================================================
 * DEALER → SUB-DEALER TRANSFER (Single + Bulk)
 * ====================================================
 *
 * PURPOSE:
 * - Transfer inverter ownership (NO warranty start)
 * - Create immutable audit log for lifecycle timeline
 *
 * RULES:
 * - Only MAIN dealer can transfer
 * - Sub-dealer must belong to dealer
 * - Inverter must be owned & unsold
 */
export const transferToSubDealer = async (req, res) => {
  try {
    const { subDealerId, serialNumbers, remarks } = req.body;

    /* --------------------------------------------------
     * 1️⃣ Basic validation
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
    const subDealer = await User.findOne({
      _id: subDealerId,
      role: "SUB_DEALER",
      parentDealer: req.user._id,
    });

    if (!subDealer) {
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
    const missing = serialNumbers.filter(sn => !foundSerials.includes(sn));

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
     * 5️⃣ TRANSFER OWNERSHIP (business state)
     * -------------------------------------------------- */
    await InverterUnit.updateMany(
      { serialNumber: { $in: serialNumbers } },
      { dealer: subDealer.name }
    );

    /* --------------------------------------------------
     * 6️⃣ 🔒 AUDIT LOG (IMMUTABLE)
     * -------------------------------------------------- */
    const transferLogs = inverters.map(inv => ({
      inverter: inv._id,
      serialNumber: inv.serialNumber,
      fromDealer: req.user._id,
      toSubDealer: subDealer._id,
      transferredBy: req.user._id,
      remarks: remarks || null,
    }));

    await DealerTransfer.insertMany(transferLogs);

    /* --------------------------------------------------
     * 7️⃣ Response
     * -------------------------------------------------- */
    return res.status(200).json({
      message: "Transfer to sub-dealer completed successfully",
      subDealer: {
        id: subDealer._id,
        name: subDealer.name,
      },
      transferredCount: serialNumbers.length,
    });
  } catch (error) {
    console.error("Dealer Transfer Error:", error);
    return res.status(500).json({
      message: "Failed to transfer inverters",
    });
  }
};