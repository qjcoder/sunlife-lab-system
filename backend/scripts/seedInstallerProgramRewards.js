/**
 * Seed default reward rules for Installer Program (PKR).
 * Run: node scripts/seedInstallerProgramRewards.js
 * Requires: MONGO_URI in .env
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import RewardRule from "../src/models/RewardRule.js";
import PointsMilestone from "../src/models/PointsMilestone.js";

dotenv.config();

const REWARD_RULES = [
  { type: "SINGLE_BATTERY", amountPkr: 5000, description: "Single battery installation" },
  { type: "SINGLE_INVERTER", amountPkr: 5000, description: "Single inverter installation" },
  { type: "SINGLE_VFD", amountPkr: 5000, description: "VFD installation" },
  { type: "BATTERY_PLUS_INVERTER", amountPkr: 12000, description: "Battery + Inverter combo" },
];

const MILESTONES = [
  { pointsRequired: 10, prizeName: "Mobile Phone", order: 1 },
  { pointsRequired: 25, prizeName: "Bike", order: 2 },
  { pointsRequired: 50, prizeName: "Umrah Package", order: 3 },
  { pointsRequired: 100, prizeName: "Car", order: 4 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  for (const rule of REWARD_RULES) {
    await RewardRule.findOneAndUpdate(
      { type: rule.type },
      { amountPkr: rule.amountPkr, description: rule.description },
      { upsert: true, new: true }
    );
    console.log(`  Reward rule: ${rule.type} = ${rule.amountPkr} PKR`);
  }

  for (const m of MILESTONES) {
    await PointsMilestone.findOneAndUpdate(
      { pointsRequired: m.pointsRequired },
      { prizeName: m.prizeName, order: m.order },
      { upsert: true, new: true }
    );
    console.log(`  Milestone: ${m.pointsRequired} points → ${m.prizeName}`);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
