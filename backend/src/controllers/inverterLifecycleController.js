import InverterUnit from "../models/InverterUnit.js";
import InverterDispatch from "../models/InverterDispatch.js";
import DealerTransfer from "../models/DealerTransfer.js";
import ServiceJob from "../models/ServiceJob.js";
import ReplacedPart from "../models/ReplacedPart.js";

/**
 * ====================================================
 * GET INVERTER LIFECYCLE
 * ====================================================
 *
 * Complete lifecycle of a physical inverter unit:
 *
 * Factory Registration
 * → Factory → Dealer Dispatch
 * → Dealer → Sub-Dealer Transfer(s)
 * → Sale (Warranty START)
 * → Service
 * → Replacements
 *
 * READ-ONLY API
 *
 * GET /api/inverters/:serialNumber/lifecycle
 */
export const getInverterLifecycle = async (req, res) => {
  try {
    const { serialNumber } = req.params;

    /* --------------------------------------------------
     * 1️⃣ Load inverter unit (factory registration)
     * -------------------------------------------------- */
    const inverter = await InverterUnit.findOne({ serialNumber })
      .populate(
        "inverterModel",
        "brand productLine variant modelCode warranty"
      )
      .lean();

    if (!inverter) {
      return res.status(404).json({ message: "Inverter not found" });
    }

    /* --------------------------------------------------
     * 2️⃣ Load factory → dealer dispatch (if exists)
     * -------------------------------------------------- */
    let factoryDispatch = null;

    if (inverter.dispatch) {
      const dispatch = await InverterDispatch.findById(inverter.dispatch)
        .select("dispatchNumber dealer dispatchDate remarks")
        .lean();

      if (dispatch) {
        factoryDispatch = {
          dispatchNumber: dispatch.dispatchNumber,
          dealer: dispatch.dealer,
          dispatchDate: dispatch.dispatchDate,
          remarks: dispatch.remarks,
        };
      }
    }

    /* --------------------------------------------------
     * 3️⃣ Load dealer → sub-dealer transfers (timeline)
     * -------------------------------------------------- */
    const dealerTransfers = await DealerTransfer.find({
      inverter: inverter._id,
    })
      .populate("fromDealer", "name")
      .populate("toSubDealer", "name")
      .sort({ createdAt: 1 })
      .lean();

    const transferTimeline = dealerTransfers.map(t => ({
      transferredAt: t.createdAt,
      fromDealer: t.fromDealer?.name,
      toSubDealer: t.toSubDealer?.name,
      remarks: t.remarks || null,
    }));

    /* --------------------------------------------------
     * 4️⃣ Load service jobs (chronological)
     * -------------------------------------------------- */
    const serviceJobs = await ServiceJob.find({
      inverterUnit: inverter._id,
    })
      .sort({ visitDate: 1 })
      .lean();

    /* --------------------------------------------------
     * 5️⃣ Attach replaced parts to each service job
     * -------------------------------------------------- */
    const serviceTimeline = [];

    for (const job of serviceJobs) {
      const replacedParts = await ReplacedPart.find({
        serviceJob: job._id,
      })
        .populate({
          path: "dispatch",
          select: "dispatchNumber serviceCenter dispatchDate",
        })
        .lean();

      serviceTimeline.push({
        serviceJob: job,
        replacedParts,
      });
    }

    /* --------------------------------------------------
     * 6️⃣ Warranty status (starts from SALE date only)
     * -------------------------------------------------- */
    let warranty = {
      startDate: null,
      status: "NOT_SOLD",
    };

    if (inverter.saleDate) {
      const end = new Date(inverter.saleDate);
      end.setMonth(
        end.getMonth() + inverter.inverterModel.warranty.partsMonths
      );

      warranty.startDate = inverter.saleDate;
      warranty.status = new Date() <= end
        ? "IN_WARRANTY"
        : "OUT_OF_WARRANTY";
    }

    /* --------------------------------------------------
     * 7️⃣ Final lifecycle response (structured)
     * -------------------------------------------------- */
    return res.json({
      factory: {
        serialNumber: inverter.serialNumber,
        inverterModel: inverter.inverterModel,
        registeredAt: inverter.createdAt,
      },

      factoryDispatch,

      dealerTransfers: transferTimeline.length > 0
        ? transferTimeline
        : null,

      sale: inverter.saleDate
        ? {
            invoiceNo: inverter.saleInvoiceNo,
            saleDate: inverter.saleDate,
            customerName: inverter.customerName,
            customerContact: inverter.customerContact,
          }
        : null,

      warranty,

      serviceJobs: serviceTimeline,
    });
  } catch (error) {
    console.error("Get Inverter Lifecycle Error:", error);
    return res.status(500).json({
      message: "Failed to fetch inverter lifecycle",
    });
  }
};