import mongoose from "mongoose";

/**
 * ====================================================
 * PRODUCT LINE MODEL
 * ====================================================
 * 
 * Represents a product line/category of inverters.
 * 
 * PURPOSE:
 * - Group inverter models by product line (e.g., "Sunlife Sky", "Sunlife Royal")
 * - Used for categorization and organization
 * - Referenced by InverterModel
 * 
 * BUSINESS RULES:
 * - Product line name must be unique
 * - Each inverter model belongs to one product line
 * 
 * USAGE:
 * - Created by factory admin
 * - Referenced when creating inverter models
 */
const productLineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("ProductLine", productLineSchema);