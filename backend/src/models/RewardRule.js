import mongoose from "mongoose";

/**
 * REWARD RULE (Cash PKR per installation type)
 * Types: SINGLE_BATTERY, SINGLE_INVERTER, SINGLE_VFD, BATTERY_PLUS_INVERTER
 * Amount can be changed anytime.
 */
const rewardRuleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["SINGLE_BATTERY", "SINGLE_INVERTER", "SINGLE_VFD", "BATTERY_PLUS_INVERTER"],
      unique: true,
    },
    amountPkr: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("RewardRule", rewardRuleSchema);
