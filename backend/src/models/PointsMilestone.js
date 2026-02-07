import mongoose from "mongoose";

/**
 * POINTS MILESTONE (non-cash prizes)
 * e.g. 10 points → Mobile, 25 → Bike, 50 → Umrah, 100 → Car
 * Prizes can be changed anytime.
 */
const pointsMilestoneSchema = new mongoose.Schema(
  {
    pointsRequired: { type: Number, required: true, min: 1, unique: true },
    prizeName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PointsMilestone", pointsMilestoneSchema);
