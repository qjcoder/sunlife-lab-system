import mongoose from "mongoose";

/**
 * INVERTER UNIT (Physical Device)
 *
 * Represents a single physical inverter manufactured in factory.
 * Identified uniquely by serialNumber.
 *
 * Lifecycle:
 * Factory → Dispatch → Dealer → Sale → Warranty → Service
 */
const inverterUnitSchema = new mongoose.Schema(
  {
    // Unique physical serial number (QR / barcode)
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Reference to inverter model (SL-Sky 4kW, 6kW, etc.)
    inverterModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterModel",
      required: true,
    },

    // Dealer who currently owns this unit (after dispatch)
    dealer: {
      type: String,
      index: true,
      default: null,
    },

    // Factory dispatch reference
    dispatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterDispatch",
      default: null,
    },

    // Sale details (filled ONLY when sold to end customer)
    saleInvoiceNo: {
      type: String,
      default: null,
    },

    saleDate: {
      type: Date,
      default: null,
    },

    customerName: {
      type: String,
      default: null,
    },

    customerContact: {
      type: String,
      default: null,
    },

    // Track who entered this serial number (for operator entries)
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = factory registration date
  }
);

export default mongoose.model("InverterUnit", inverterUnitSchema);