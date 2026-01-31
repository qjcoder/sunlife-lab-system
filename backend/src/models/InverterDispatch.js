import mongoose from "mongoose";

/**
 * INVERTER DISPATCH
 *
 * Represents bulk movement of inverter units
 * from Factory → Dealer.
 */
const inverterDispatchSchema = new mongoose.Schema(
  {
    // Human-readable dispatch reference (e.g. FD-2026-001)
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Dealer / distributor receiving the units
    dealer: {
      type: String,
      required: true,
      index: true,
    },

    // Physical inverter units included in this dispatch
    inverterUnits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InverterUnit",
        required: true,
      },
    ],

    // Factory admin who created the dispatch
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Dispatch date
    dispatchDate: {
      type: Date,
      default: Date.now,
    },

    // Optional notes (truck number, batch info, etc.)
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // audit trail
  }
);

export default mongoose.model("InverterDispatch", inverterDispatchSchema);