import InverterUnit from "../models/InverterUnit.js";
import InverterSale from "../models/InverterSale.js";

/**
 * SELL INVERTER UNIT
 *
 * Dealer → Customer sale
 * - Can happen ONLY ONCE
 * - Warranty starts from saleDate
 * - Creates immutable sale record
 *
 * ROLE:
 * DEALER / FACTORY_ADMIN
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

    // 1️⃣ Basic validation
    if (!serialNumber || !saleInvoiceNo || !saleDate || !customerName) {
      return res.status(400).json({
        message: "serialNumber, saleInvoiceNo, saleDate, customerName are required",
      });
    }

    // 2️⃣ Load inverter unit
    const inverter = await InverterUnit.findOne({ serialNumber });
    if (!inverter) {
      return res.status(404).json({ message: "Inverter not found" });
    }

    // 3️⃣ Prevent re-sale (IMMUTABLE)
    if (inverter.saleDate) {
      return res.status(409).json({
        message: "Inverter already sold. Sale is immutable.",
      });
    }

    // 4️⃣ Ensure inverter was dispatched to a dealer
    if (!inverter.dealer || !inverter.dispatch) {
      return res.status(403).json({
        message: "Inverter must be dispatched to dealer before sale",
      });
    }

    // 5️⃣ Create sale record (AUDIT LOG)
    const sale = await InverterSale.create({
      inverterUnit: inverter._id,
      dealer: inverter.dealer,
      invoiceNumber: saleInvoiceNo,
      saleDate: new Date(saleDate),
      customerName,
      customerContact,
      soldBy: req.user.userId,
    });

    // 6️⃣ Update inverter unit (CURRENT STATE)
    inverter.saleInvoiceNo = saleInvoiceNo;
    inverter.saleDate = new Date(saleDate);
    inverter.customerName = customerName;
    inverter.customerContact = customerContact;

    await inverter.save();

    return res.json({
      message: "Inverter sold successfully. Warranty activated.",
      inverterUnit: inverter,
      sale,
    });
  } catch (error) {
    console.error("Sell Inverter Error:", error);
    return res.status(500).json({
      message: "Failed to record inverter sale",
    });
  }
};