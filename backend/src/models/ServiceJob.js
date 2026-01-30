import mongoose from "mongoose";

const serviceJobSchema = new mongoose.Schema(
  {
    inverterUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
      required: true
    },

    serviceCenter: {
      type: String,
      required: true
    },

    reportedFault: {
      type: String
    },

    visitDate: {
      type: Date,
      required: true
    },

    /**
     * Warranty snapshot at time of visit
     * Calculated automatically, not user input
     */
    warrantyStatus: {
      parts: {
        type: Boolean,
        required: true
      },
      service: {
        type: Boolean,
        required: true
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("ServiceJob", serviceJobSchema);