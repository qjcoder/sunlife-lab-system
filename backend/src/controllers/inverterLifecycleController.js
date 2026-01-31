import InverterUnit from "../models/InverterUnit.js";
import InverterDispatch from "../models/InverterDispatch.js";
import ServiceJob from "../models/ServiceJob.js";
import ReplacedPart from "../models/ReplacedPart.js";

/**
 * GET INVERTER LIFECYCLE
 *
 * Complete lifecycle of a physical inverter unit:
 * Factory → Dispatch → Sale → Warranty → Service → Replacement
 *
 * GET /api/inverters/:serialNumber/lifecycle
 */
export const getInverterLifecycle = async (req, res) => {
  try {
    const { serialNumber } = req.params;

    /**
     * 1️⃣ Load inverter unit (factory registration)
     */
    const inverter = await InverterUnit.findOne({ serialNumber })
      .populate(
        "inverterModel",
        "brand productLine variant modelCode warranty"
      )
      .lean();

    if (!inverter) {
      return res.status(404).json({ message: "Inverter not found" });
    }

    /**
     * 2️⃣ Load factory → dealer dispatch (if exists)
     */
    let dispatchInfo = null;

    if (inverter.dispatch) {
      const dispatch = await InverterDispatch.findById(inverter.dispatch)
        .select("dispatchNumber dealer dispatchDate remarks")
        .lean();

      if (dispatch) {
        dispatchInfo = dispatch;
      }
    }

    /**
     * 3️⃣ Load service jobs (chronological)
     */
    const serviceJobs = await ServiceJob.find({
      inverterUnit: inverter._id,
    })
      .sort({ visitDate: 1 })
      .lean();

    /**
     * 4️⃣ Attach replaced parts to each service job
     */
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

    /**
     * 5️⃣ Warranty status (starts from sale date)
     */
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
      warranty.status = new Date() <= end ? "IN_WARRANTY" : "OUT_OF_WARRANTY";
    }

    /**
     * 6️⃣ Final structured lifecycle response
     */
    return res.json({
      factory: {
        serialNumber: inverter.serialNumber,
        inverterModel: inverter.inverterModel,
        registeredAt: inverter.createdAt,
      },

      factoryDispatch: dispatchInfo
        ? {
            dispatchNumber: dispatchInfo.dispatchNumber,
            dealer: dispatchInfo.dealer,
            dispatchDate: dispatchInfo.dispatchDate,
            remarks: dispatchInfo.remarks,
          }
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