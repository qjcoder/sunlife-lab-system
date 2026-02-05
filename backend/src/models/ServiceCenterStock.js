import mongoose from "mongoose";

/**
 * ====================================================
 * SERVICE CENTER STOCK MODEL
 * ====================================================
 * 
 * Represents cached stock view for service centers.
 * 
 * PURPOSE:
 * - Fast lookup of available parts at service centers
 * - Updated automatically when parts are dispatched or used
 * - Derived from PartDispatch and ReplacedPart records
 * 
 * BUSINESS RULES:
 * - Stock increases when parts are dispatched from factory
 * - Stock decreases when parts are used in replacements
 * - Each service center + part code combination is unique
 * - Quantity cannot be negative
 * 
 * IMPORTANT:
 * - This is a CACHED view, not the source of truth
 * - Actual stock is calculated from dispatch and replacement records
 * - Used for performance optimization
 */
const serviceCenterStockSchema = new mongoose.Schema(
  {
    serviceCenter: {
      type: String,
      required: true,
      index: true,
    },

    partCode: {
      type: String,
      required: true,
      index: true,
    },

    partName: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

serviceCenterStockSchema.index(
  { serviceCenter: 1, partCode: 1 },
  { unique: true }
);

export default mongoose.model(
  "ServiceCenterStock",
  serviceCenterStockSchema
);