import mongoose from "mongoose";

const inverterUnitSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: true,
      unique: true
    },

    inverterModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterModel",
      required: true
    },

    saleInvoiceNo: {
      type: String,
      required: true
    },

    saleDate: {
      type: Date,
      required: true
    },

    customerName: {
      type: String
    },

    customerContact: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("InverterUnit", inverterUnitSchema);