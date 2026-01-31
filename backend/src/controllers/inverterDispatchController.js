import InverterDispatch from "../models/InverterDispatch.js";
import InverterUnit from "../models/InverterUnit.js";

/**
 * CREATE INVERTER DISPATCH
 *
 * Factory sends inverter units to dealer in bulk.
 *
 * POST /api/inverter-dispatches
 *
 * ROLE:
 * FACTORY_ADMIN only
 */
export const createInverterDispatch = async (req, res) => {
  try {
    const { dispatchNumber, dealer, inverterUnits, remarks } = req.body;

    /**
     * 1️⃣ Basic validation
     */
    if (
      !dispatchNumber ||
      !dealer ||
      !Array.isArray(inverterUnits) ||
      inverterUnits.length === 0
    ) {
      return res.status(400).json({
        message: "dispatchNumber, dealer, and inverterUnits are required",
      });
    }

    /**
     * 2️⃣ Ensure dispatch number is unique
     */
    const existing = await InverterDispatch.findOne({ dispatchNumber });
    if (existing) {
      return res.status(409).json({
        message: "Dispatch with this number already exists",
      });
    }

    /**
     * 3️⃣ Load inverter units
     */
    const units = await InverterUnit.find({
      _id: { $in: inverterUnits },
    });

    if (units.length !== inverterUnits.length) {
      return res.status(404).json({
        message: "One or more inverter units not found",
      });
    }

    /**
     * 4️⃣ Prevent redispatching
     */
    for (const unit of units) {
      if (unit.dispatch) {
        return res.status(403).json({
          message: `Inverter ${unit.serialNumber} already dispatched`,
        });
      }
    }

    /**
     * 5️⃣ Create dispatch record
     */
    const dispatch = await InverterDispatch.create({
      dispatchNumber,
      dealer,
      inverterUnits,
      dispatchedBy: req.user.userId,
      remarks,
    });

    /**
     * 6️⃣ Update inverter units (ownership move)
     */
    await InverterUnit.updateMany(
      { _id: { $in: inverterUnits } },
      {
        dealer,
        dispatch: dispatch._id,
      }
    );

    return res.status(201).json({
      message: "Inverter dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Create Inverter Dispatch Error:", error);
    return res.status(500).json({
      message: "Failed to create inverter dispatch",
    });
  }
};