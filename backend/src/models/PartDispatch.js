import mongoose from "mongoose";

/**
 * DispatchedItem
 * ----------------
 * Represents a single part line inside a dispatch.
 * One dispatch can contain multiple different parts.
 * This is NOT a replacement — only stock movement.
 */
const dispatchedItemSchema = new mongoose.Schema(
  {
    // Internal / factory part code (e.g. MB-4KW-V2)
    partCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Human-readable part name (e.g. Main Control Board)
    partName: {
      type: String,
      required: true,
      trim: true,
    },

    // Quantity dispatched for this part
    quantity: {
      type: Number,
      required: true,
      min: 1, // Prevent zero or negative stock
    },

    // Model & variant (from Part catalog) for display/audit
    modelName: { type: String, trim: true },
    variant: { type: String, trim: true },
  },
  {
    _id: false, // No separate ID needed for embedded items
  }
);

/**
 * PartDispatch
 * -------------
 * Represents a bulk dispatch of parts
 * from factory to a service center.
 *
 * 🔑 Key rules:
 * - Created ONLY by FACTORY_ADMIN
 * - Not tied to inverter or service job
 * - Creates available stock at service center
 * - Immutable (audit-safe)
 */
const partDispatchSchema = new mongoose.Schema(
  {
    // Unique dispatch reference (e.g. DISP-2026-001)
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Destination service center
    // Used for stock visibility and filtering
    serviceCenter: {
      type: String,
      required: true,
      index: true,
    },

    // List of parts dispatched in this shipment
    // One dispatch → many part items
    dispatchedItems: {
      type: [dispatchedItemSchema],
      required: true,
    },

    // Factory admin user who created the dispatch
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Date when parts were dispatched
    // Defaults to creation time
    dispatchDate: {
      type: Date,
      default: Date.now,
    },

    // Optional notes (courier, reference, remarks)
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt for audit trail
  }
);

export default mongoose.model("PartDispatch", partDispatchSchema);