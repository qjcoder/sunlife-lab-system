import mongoose from "mongoose";

const inverterSaleSchema = new mongoose.Schema(
  {
    // 🔗 Physical inverter being sold
    inverterUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
      required: true,
      unique: true, // ❗ one inverter can be sold only once
    },

    // Dealer who sold the inverter
    dealer: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Dealer invoice number
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Sale date (warranty starts from here)
    saleDate: {
      type: Date,
      required: true,
      index: true,
    },

    // End customer details
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerContact: {
      type: String,
      trim: true,
    },

    // User who recorded the sale (audit)
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // createdAt = sale entry time
  }
);

export default mongoose.model("InverterSale", inverterSaleSchema);