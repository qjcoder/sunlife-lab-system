import mongoose from "mongoose";

/**
 * INVERTER MODEL (MASTER DATA)
 *
 * Represents a product definition, NOT a physical unit.
 * Created once by Factory Admin.
 *
 * Examples:
 * - Sunlife SL-Sky 4kW
 * - Sunlife SL-Sky 6kW
 */
const inverterModelSchema = new mongoose.Schema(
  {
    // Brand name (e.g. Sunlife)
    brand: {
      type: String,
      required: true,
      trim: true,
    },

    // Product family / series (e.g. SL-Sky)
    productLine: {
      type: String,
      required: true,
      trim: true,
    },

    // Variant or capacity (e.g. 4kW, 6kW)
    variant: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique factory model code (e.g. SL-SKY-4KW)
    modelCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Full model name (e.g. Sunlife SL-Sky 4kW) - computed from brand + productLine + variant
    modelName: {
      type: String,
      trim: true,
    },

    // Product image path (e.g. /products/sl-sky-4kw.jpg)
    image: {
      type: String,
      trim: true,
    },

    // Technical datasheet PDF path (e.g. /products/datasheets/sl-sky-4kw.pdf)
    datasheet: {
      type: String,
      trim: true,
    },

    // Warranty definition for this model
    warranty: {
      partsMonths: {
        type: Number,
        required: true,
        default: 12,
      },
      serviceMonths: {
        type: Number,
        required: true,
        default: 24,
      },
    },

    // Enable / disable model without deleting history
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // audit trail
  }
);

// Pre-save hook to automatically compute and store modelName and image
inverterModelSchema.pre('save', async function () {
  // Compute modelName if not set
  if (!this.modelName && this.brand && this.productLine && this.variant) {
    this.modelName = `${this.brand} ${this.productLine} ${this.variant}`.trim();
  }
  
  // Generate image path if not set
  if (!this.image && this.modelCode) {
    // Convert modelCode to lowercase for image filename
    // Try .jpg first, then .png (will be handled by frontend)
    // Example: SL-SKY-4KW -> /products/sl-sky-4kw.jpg
    this.image = `/products/${this.modelCode.toLowerCase()}.jpg`;
  }
});

// Helper function to compute modelName
inverterModelSchema.statics.computeModelName = function(brand, productLine, variant) {
  if (brand && productLine && variant) {
    return `${brand} ${productLine} ${variant}`.trim();
  }
  return '';
};

export default mongoose.model("InverterModel", inverterModelSchema);