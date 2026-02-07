import mongoose from "mongoose";

/**
 * Part (catalog)
 * ---------------
 * Parts are per product model/variant. Each model and variant can have different parts.
 * partCode is unique per inverterModel (same code can exist for different models).
 */
const partSchema = new mongoose.Schema(
  {
    inverterModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterModel",
      required: true,
    },
    partCode: {
      type: String,
      required: true,
      trim: true,
    },
    partName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

partSchema.index({ inverterModel: 1, partCode: 1 }, { unique: true });

export default mongoose.model("Part", partSchema);
