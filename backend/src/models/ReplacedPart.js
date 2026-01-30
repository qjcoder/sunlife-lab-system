import mongoose from "mongoose";

const replacedPartSchema = new mongoose.Schema(
  {
    serviceJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceJob",
      required: true
    },

    modelPart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelPart",
      required: true
    },

    replacementDate: {
      type: Date,
      required: true
    },

    /**
     * Final warranty decision per part
     * Independent of service warranty
     */
    underWarranty: {
      type: Boolean,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("ReplacedPart", replacedPartSchema);