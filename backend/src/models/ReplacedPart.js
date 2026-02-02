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
    serviceJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceJob",
      required: true,
      index: true,
    },

    // 🔗 Inverter unit on which replacement happened
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
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // 📅 Date when replacement or repair was performed
    replacementDate: {
      type: Date,
      required: true,
      index: true,
    },

    // 🔧 Replacement vs Repair
    // REPAIR does NOT consume factory stock
    replacementType: {
      type: String,
      enum: ["REPLACEMENT", "REPAIR"],
      default: "REPLACEMENT",
      required: true,
    },

    // 🚚 Source dispatch from factory
    // Enforces that every replacement comes from dispatched stock
    dispatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartDispatch",
      required: true,
      index: true,
    },

    /* ====================================================
     * WARRANTY & COST LIABILITY (NEW — STEP 9.1)
     * ====================================================
     * These fields are DERIVED by controller logic.
     * NEVER sent directly from client.
     */

    // 💰 Who bears the cost of this replacement
    costLiability: {
      type: String,
      enum: ["FACTORY", "CUSTOMER"],
      required: true,
      index: true,
    },

    // 🧾 Whether this replacement is eligible
    // for factory warranty reimbursement
    warrantyClaimEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // Full audit trail
  }
);

/**
 * ====================================================
 * INDEXES
 * ====================================================
 */

// Warranty enforcement & abuse prevention
replacedPartSchema.index({
  inverterUnit: 1,
  partCode: 1,
  replacementType: 1,
});

// Warranty claim reporting
replacedPartSchema.index({
  warrantyClaimEligible: 1,
  replacementDate: -1,
});

// Cost analytics
replacedPartSchema.index({
  partCode: 1,
  costLiability: 1,
});

export default mongoose.model("ReplacedPart", replacedPartSchema);