import mongoose from "mongoose";

/**
 * ====================================================
 * MODEL PART MODEL
 * ====================================================
 * 
 * Represents parts/components that belong to an inverter model.
 * 
 * PURPOSE:
 * - Define parts catalog for each inverter model
 * - Track part codes, names, categories, and revisions
 * - Support service center part management
 * 
 * BUSINESS RULES:
 * - Each part must belong to an inverter model
 * - Part code must be unique per model
 * - Parts can be categorized (PCB, Communication, Power, Mechanical)
 * - Parts can be marked as repairable
 * 
 * USAGE:
 * - Used by service centers to identify parts for replacement
 * - Linked to part dispatches and replacements
 */
const modelPartSchema = new mongoose.Schema(
  {
    inverterModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterModel",
      required: true
    },

    partCode: {
      type: String,
      required: true
    },

    partName: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: ["PCB", "Communication", "Power", "Mechanical"],
      required: true
    },

    revision: {
      type: String
    },

    repairable: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/**
 * Prevent duplicate parts per model
 * Same model + same partCode cannot exist twice
 */
modelPartSchema.index(
  { inverterModel: 1, partCode: 1 },
  { unique: true }
);

export default mongoose.model("ModelPart", modelPartSchema);