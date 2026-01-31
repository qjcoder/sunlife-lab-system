import mongoose from "mongoose";

/**
 * INVERTER MODEL (MASTER DATA)
 *
 * Represents a product definition, NOT a physical unit.
 * Created once by Factory Admin.
 *
 * Examples:
 * - Sunlife SL-Sky 4kW
 * - Sunlife SL-Sky 6kW
 */
const inverterModelSchema = new mongoose.Schema(
  {
    // Brand name (e.g. Sunlife)
    brand: {
      type: String,
      required: true,
      trim: true,
    },

    // Product family / series (e.g. SL-Sky)
    productLine: {
      type: String,
      required: true,
      trim: true,
    },

    // Variant or capacity (e.g. 4kW, 6kW)
    variant: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique factory model code (e.g. SL-SKY-4KW)
    modelCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Warranty definition for this model
    warranty: {
      partsMonths: {
        type: Number,
        required: true,
        default: 12,
      },
      serviceMonths: {
        type: Number,
        required: true,
        default: 24,
      },
    },

    // Enable / disable model without deleting history
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // audit trail
  }
);

export default mongoose.model("InverterModel", inverterModelSchema);