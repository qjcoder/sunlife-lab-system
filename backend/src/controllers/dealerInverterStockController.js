import InverterDispatch from "../models/InverterDispatch.js";
import InverterUnit from "../models/InverterUnit.js";

/**
 * GET DEALER INVERTER STOCK
 * ----------------------------------------------------
 * READ-ONLY derived stock for dealers
 *
 * Stock is CALCULATED from:
 *   + Factory → Dealer inverter dispatches
 *   − Dealer → Customer inverter sales
 *
 * ACCESS:
 * - DEALER → only own stock
 * - FACTORY_ADMIN → can view any dealer
 *
 * URL:
 * GET /api/dealer-inverter-stock
 * GET /api/dealer-inverter-stock?dealer=XYZ   (FACTORY_ADMIN)
 */
export const getDealerInverterStock = async (req, res) => {
  try {
    let dealer;

    /* ---------------------------------------------
     * STEP 1: Resolve dealer context
     * ------------------------------------------- */
    if (req.user.role === "DEALER") {
      dealer = req.user.name;
    } else if (req.user.role === "FACTORY_ADMIN") {
      dealer = req.query.dealer;
    }

    if (!dealer) {
      return res.status(400).json({
        message: "dealer is required",
      });
    }

    /* ---------------------------------------------
     * STEP 2: Load all inverter dispatches to dealer
     * ------------------------------------------- */
    const dispatches = await InverterDispatch.find({
      dealer,
    })
      .populate({
        path: "inverterUnits",
        populate: {
          path: "inverterModel",
          select: "brand productLine variant modelCode",
        },
      })
      .lean();

    /* ---------------------------------------------
     * STEP 3: Build stock map
     * ------------------------------------------- */
    const stock = [];

    for (const dispatch of dispatches) {
      for (const unit of dispatch.inverterUnits) {
        // ❌ Skip sold inverters
        if (unit.saleDate) continue;

        stock.push({
          serialNumber: unit.serialNumber,
          inverterModel: unit.inverterModel,
          dispatchedAt: dispatch.dispatchDate,
          dispatchNumber: dispatch.dispatchNumber,
        });
      }
    }

    /* ---------------------------------------------
     * STEP 4: Response
     * ------------------------------------------- */
    return res.json({
      dealer,
      count: stock.length,
      availableInverters: stock,
    });
  } catch (error) {
    console.error("Get Dealer Inverter Stock Error:", error);
    return res.status(500).json({
      message: "Failed to fetch dealer inverter stock",
    });
  }
};