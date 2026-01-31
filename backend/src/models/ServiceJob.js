import mongoose from "mongoose";

/**
 * SERVICE JOB
 *
 * Represents ONE service visit for a sold inverter
 */
const serviceJobSchema = new mongoose.Schema(
  {
    // 🔗 Physical inverter being serviced
    inverterUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InverterUnit",
      required: true,
      index: true,
    },

    // Service center handling this job
    serviceCenter: {
      type: String,
      required: true,
      index: true,
    },

    // Fault reported by customer / technician
    reportedFault: {
      type: String,
      trim: true,
    },

    // Date of site visit
    visitDate: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * WARRANTY SNAPSHOT
     * Locked at time of visit
     */
    warrantyStatus: {
      parts: {
        type: Boolean,
        required: true,
      },
      service: {
        type: Boolean,
        required: true,
      },
    },

    // User who created this service job
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // createdAt = job created time
  }
);

export default mongoose.model("ServiceJob", serviceJobSchema);