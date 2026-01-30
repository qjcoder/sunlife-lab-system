import mongoose from "mongoose";

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