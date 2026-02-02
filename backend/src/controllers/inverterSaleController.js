import InverterUnit from "../models/InverterUnit.js";

/**
 * ====================================================
 * SINGLE INVERTER SALE
 * ====================================================
 *
 * WHO CAN SELL:
 * - FACTORY_ADMIN (direct sale)
 * - DEALER
 * - SUB_DEALER
 *
 * WARRANTY:
 * - STARTS at this moment
 *
 * RULES:
 * - Inverter must exist
 * - Inverter must NOT be already sold
 * - Inverter must be owned by logged-in seller
 */
export const sellInverterUnit = async (req, res) => {
  try {
    const {
      serialNumber,
      saleInvoiceNo,
      saleDate,
      customerName,
      customerContact,
    } = req.body;

    /* ------------------------------------------------
     * 1️⃣ Validate input
     * ------------------------------------------------ */
    if (!serialNumber || !saleInvoiceNo || !saleDate) {
      return res.status(400).json({
        message: "serialNumber, saleInvoiceNo, and saleDate are required",
      });
    }

    /* ------------------------------------------------
     * 2️⃣ Load inverter
     * ------------------------------------------------ */
    const inverter = await InverterUnit.findOne({ serialNumber });

    if (!inverter) {
      return res.status(404).json({
        message: "Inverter not found",
      });
    }

    /* ------------------------------------------------
     * 3️⃣ Ownership check (CRITICAL)
     * ------------------------------------------------
     * Dealer / Sub-Dealer / Factory
     * Ownership is determined ONLY by name match
     */
    if (inverter.dealer !== req.user.name) {
      return res.status(403).json({
        message: "You do not own this inverter",
      });
    }

    /* ------------------------------------------------
     * 4️⃣ Prevent double sale
     * ------------------------------------------------ */
    if (inverter.saleDate) {
      return res.status(409).json({
        message: "Inverter already sold",
      });
    }

    /* ------------------------------------------------
     * 5️⃣ Apply sale (WARRANTY STARTS)
     * ------------------------------------------------ */
    inverter.saleInvoiceNo = saleInvoiceNo;
    inverter.saleDate = new Date(saleDate);
    inverter.customerName = customerName || null;
    inverter.customerContact = customerContact || null;

    await inverter.save();

    return res.status(200).json({
      message: "Inverter sold successfully. Warranty activated.",
      inverter,
    });
  } catch (error) {
    console.error("Sell Inverter Error:", error);
    return res.status(500).json({
      message: "Failed to record inverter sale",
    });
  }
};

/**
 * ====================================================
 * BULK INVERTER SALE
 * ====================================================
 *
 * WHO:
 * - DEALER
 * - SUB_DEALER
 *
 * WARRANTY:
 * - STARTS per inverter
 *
 * STRICT RULE:
 * ❌ If ANY serial fails → ENTIRE request FAILS
 */
export const bulkSellInverters = async (req, res) => {
  try {
    const { sales } = req.body;

    /* ------------------------------------------------
     * 1️⃣ Validate payload
     * ------------------------------------------------ */
    if (!Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({
        message: "sales array is required",
      });
    }

    const serialNumbers = sales.map(s => s.serialNumber?.trim());

    if (serialNumbers.some(sn => !sn)) {
      return res.status(400).json({
        message: "Each sale must include a valid serialNumber",
      });
    }

    /* ------------------------------------------------
     * 2️⃣ Load all inverter units
     * ------------------------------------------------ */
    const inverters = await InverterUnit.find({
      serialNumber: { $in: serialNumbers },
    });

    /* ------------------------------------------------
     * 3️⃣ Detect missing serials
     * ------------------------------------------------ */
    if (inverters.length !== serialNumbers.length) {
      const found = inverters.map(i => i.serialNumber);
      const missing = serialNumbers.filter(sn => !found.includes(sn));

      return res.status(404).json({
        message: "Some serial numbers not found",
        missingSerials: missing,
      });
    }

    /* ------------------------------------------------
     * 4️⃣ HARD VALIDATION (FAIL FAST)
     * ------------------------------------------------ */
    for (const inverter of inverters) {
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

    /* ------------------------------------------------
     * 5️⃣ Apply sales (atomic intent)
     * ------------------------------------------------ */
    for (const sale of sales) {
      await InverterUnit.updateOne(
        { serialNumber: sale.serialNumber },
        {
          saleInvoiceNo: sale.saleInvoiceNo,
          saleDate: new Date(sale.saleDate),
          customerName: sale.customerName || null,
          customerContact: sale.customerContact || null,
        }
      );
    }

    return res.status(200).json({
      message: "Bulk inverter sale completed successfully",
      count: sales.length,
    });
  } catch (error) {
    console.error("Bulk Sell Inverter Error:", error);
    return res.status(500).json({
      message: "Failed to bulk sell inverters",
    });
  }
};