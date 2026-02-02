import InverterDispatch from "../models/InverterDispatch.js";
import InverterUnit from "../models/InverterUnit.js";

/**
 * ====================================================
 * CREATE INVERTER DISPATCH (Factory → Dealer)
 * ====================================================
 *
 * RULES (STRICT):
 * - ALL serials must exist
 * - NONE must be sold
 * - NONE must be already dispatched
 * - If ANY fails → entire request fails
 *
 * ROLE:
 * - FACTORY_ADMIN only
 *
 * URL:
 * POST /api/inverter-dispatches
 *
 * Body:
 * {
 *   "dispatchNumber": "FD-2026-004",
 *   "dealer": "Punjab Solar Traders",
 *   "dispatchDate": "2026-02-07",
 *   "serialNumbers": ["SLI6K-0001", "SLI6K-0002"],
 *   "remarks": "Initial stock"
 * }
 */
export const createInverterDispatch = async (req, res) => {
  try {
    const {
      dispatchNumber,
      dealer,
      dispatchDate,
      serialNumbers,
      remarks,
    } = req.body;

    /* ------------------------------------
     * 1️⃣ Basic validation
     * ---------------------------------- */
    if (
      !dispatchNumber ||
      !dealer ||
      !Array.isArray(serialNumbers) ||
      serialNumbers.length === 0
    ) {
      return res.status(400).json({
        message:
          "dispatchNumber, dealer, and serialNumbers array are required",
      });
    }

    /* ------------------------------------
     * 2️⃣ Ensure dispatchNumber is unique
     * ---------------------------------- */
    const existingDispatch = await InverterDispatch.findOne({
      dispatchNumber,
    });
    if (existingDispatch) {
      return res.status(409).json({
        message: "Dispatch with this number already exists",
      });
    }

    /* ------------------------------------
     * 3️⃣ Load ALL inverter units by serial
     * ---------------------------------- */
    const units = await InverterUnit.find({
      serialNumber: { $in: serialNumbers },
    });

    if (units.length !== serialNumbers.length) {
      const found = units.map(u => u.serialNumber);
      const missing = serialNumbers.filter(
        sn => !found.includes(sn)
      );

      return res.status(404).json({
        message: "Invalid serial in request",
        serialNumber: missing[0],
        reason: "NOT_FOUND",
      });
    }

    /* ------------------------------------
     * 4️⃣ STRICT STOCK ENFORCEMENT
     * ---------------------------------- */
    for (const unit of units) {
      if (unit.saleDate) {
        return res.status(409).json({
          message: "Invalid serial in request",
          serialNumber: unit.serialNumber,
          reason: "ALREADY_SOLD",
        });
      }

      if (unit.dispatch || unit.dealer) {
        return res.status(403).json({
          message: "Invalid serial in request",
          serialNumber: unit.serialNumber,
          reason: "ALREADY_DISPATCHED",
        });
      }
    }

    /* ------------------------------------
     * 5️⃣ Create dispatch record
     * ---------------------------------- */
    const dispatch = await InverterDispatch.create({
      dispatchNumber,
      dealer,
      dispatchDate,
      inverterUnits: units.map(u => u._id),
      dispatchedBy: req.user.userId,
      remarks,
    });

    /* ------------------------------------
     * 6️⃣ Update inverter ownership (ATOMIC)
     * ---------------------------------- */
    await InverterUnit.updateMany(
      { _id: { $in: units.map(u => u._id) } },
      {
        dealer,
        dispatch: dispatch._id,
      }
    );

    return res.status(201).json({
      message: "Inverter dispatch created successfully",
      dispatchNumber: dispatch.dispatchNumber,
      dealer,
      dispatchedCount: units.length,
    });
  } catch (error) {
    console.error("Create Inverter Dispatch Error:", error);
    return res.status(500).json({
      message: "Failed to create inverter dispatch",
    });
  }
};