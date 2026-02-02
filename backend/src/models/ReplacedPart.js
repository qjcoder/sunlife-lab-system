import mongoose from "mongoose";

/**
 * ReplacedPart
 * ----------------------------------------------------
 * Represents a single part replacement or repair
 * performed during a service job on an inverter unit.
 *
 * This is the core audit model for:
 * Factory → Dispatch → Service Center → Inverter → Warranty
 */
const replacedPartSchema = new mongoose.Schema(
  {
    // 🔗 Service job where this part was replaced
    // One service job can have multiple replaced parts
    serviceJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceJob",
      required: true,
      index: true,
    },

    // 🔗 Inverter unit on which replacement happened
    // Enables inverter lifecycle & warranty tracking
    inverterUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
      required: true,
      index: true,
    },

    // 🏭 Factory / internal part code (SKU / BOM code)
    partCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // 🧾 Human-readable part name
    partName: {
      type: String,
      required: true,
      trim: true,
    },

    // 📦 Quantity consumed in this replacement
    // Always ≥ 1
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // 📅 Date when replacement or repair was performed
    replacementDate: {
      type: Date,
      required: true,
    },

    // 🔧 Replacement vs Repair
    // REPAIR does NOT consume factory stock
    replacementType: {
      type: String,
      enum: ["REPLACEMENT", "REPAIR"],
      default: "REPLACEMENT",
    },

    // 🚚 Source dispatch from factory
    // Enforces that every replacement comes from dispatched stock
    dispatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartDispatch",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt for full audit trail
  }
);

/**
 * Compound index
 * ----------------------------------------------------
 * Enables:
 * - Fast warranty enforcement
 * - Failure analytics
 * - Replacement limit checks
 */
replacedPartSchema.index({
  inverterUnit: 1,
  partCode: 1,
  replacementType: 1,
});

export default mongoose.model("ReplacedPart", replacedPartSchema);