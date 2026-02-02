// src/models/ServiceCenterStock.js
import mongoose from "mongoose";

const serviceCenterStockSchema = new mongoose.Schema(
  {
    serviceCenter: {
      type: String,
      required: true,
      index: true,
    },

    partCode: {
      type: String,
      required: true,
      index: true,
    },

    partName: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

serviceCenterStockSchema.index(
  { serviceCenter: 1, partCode: 1 },
  { unique: true }
);

export default mongoose.model(
  "ServiceCenterStock",
  serviceCenterStockSchema
);