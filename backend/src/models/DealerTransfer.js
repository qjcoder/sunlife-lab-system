import mongoose from "mongoose";

/**
 * ====================================================
 * DEALER → SUB-DEALER TRANSFER (AUDIT LOG)
 * ====================================================
 *
 * PURPOSE:
 * - Immutable audit trail for inverter ownership transfers
 * - Used ONLY for lifecycle timeline & warranty audit
 *
 * IMPORTANT:
 * - NO business logic depends on this model
 * - NEVER updated or deleted
 * - APPEND ONLY
 */

const dealerTransferSchema = new mongoose.Schema(
  {
    // Physical inverter being transferred
    inverter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
      required: true,
      index: true,
    },

    // Serial for fast reads / audits
    serialNumber: {
      type: String,
      required: true,
      index: true,
    },

    // From (main dealer)
    fromDealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // To (sub-dealer)
    toSubDealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who performed the action (dealer account)
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional note
    remarks: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = transfer time
  }
);

export default mongoose.model("DealerTransfer", dealerTransferSchema);