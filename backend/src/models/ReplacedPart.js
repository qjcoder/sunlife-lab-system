import mongoose from "mongoose";

const replacedPartSchema = new mongoose.Schema(
  {
    serviceJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceJob",
      required: true,
    },

    inverterUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
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

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    replacementDate: {
      type: Date,
      required: true,
    },

    replacementType: {
      type: String,
      enum: ["REPLACEMENT", "REPAIR"],
      default: "REPLACEMENT",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ReplacedPart", replacedPartSchema);