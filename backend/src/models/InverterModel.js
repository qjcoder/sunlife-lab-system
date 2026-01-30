import mongoose from "mongoose";

const inverterModelSchema = new mongoose.Schema(
  {
    productLine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductLine",
      required: true
    },

    modelCode: {
      type: String,
      required: true,
      unique: true
    },

    displayName: {
      type: String,
      required: true
    },

    ratedPowerKW: {
      type: Number,
      required: true
    },

    warranty: {
      partsMonths: {
        type: Number,
        default: 12
      },
      serviceMonths: {
        type: Number,
        default: 24
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("InverterModel", inverterModelSchema);