/**
 * Remove all dummy/trial data added by seedDashboardDummyData and seedLifecycleTrialData.
 *
 * Deletes (in order):
 * - ReplacedPart (trial service jobs)
 * - ServiceJob (trial/demo units)
 * - PartDispatch (trial: Lahore Service Center + PD-TRIAL-*)
 * - DealerTransfer (trial units)
 * - InverterDispatch (FD-TRIAL-*)
 * - InverterUnit (SL-TRIAL-001..004, SL-DEMO-001..005)
 * - InverterModel (SL-TRIAL-4KW)
 * - Users: service.center@sunlife.com, dealer.trial@sunlife.com, subdealer.trial@sunlife.com
 *
 * Run from backend: node scripts/removeDummyData.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";
import InverterModel from "../src/models/InverterModel.js";
import InverterUnit from "../src/models/InverterUnit.js";
import InverterDispatch from "../src/models/InverterDispatch.js";
import DealerTransfer from "../src/models/DealerTransfer.js";
import PartDispatch from "../src/models/PartDispatch.js";
import ServiceJob from "../src/models/ServiceJob.js";
import ReplacedPart from "../src/models/ReplacedPart.js";

dotenv.config();

const TRIAL_SERIALS = [
  "SL-TRIAL-001",
  "SL-TRIAL-002",
  "SL-TRIAL-003",
  "SL-TRIAL-004",
];
const DEMO_SERIALS = [
  "SL-DEMO-001",
  "SL-DEMO-002",
  "SL-DEMO-003",
  "SL-DEMO-004",
  "SL-DEMO-005",
];
const DUMMY_SERIALS = [...TRIAL_SERIALS, ...DEMO_SERIALS];
const DUMMY_USER_EMAILS = [
  "service.center@sunlife.com",
  "dealer.trial@sunlife.com",
  "subdealer.trial@sunlife.com",
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB\nRemoving dummy data...\n");

  const trialUnitIds = (
    await InverterUnit.find({ serialNumber: { $in: DUMMY_SERIALS } }).select("_id").lean()
  ).map((u) => u._id);

  if (trialUnitIds.length === 0) {
    console.log("  No dummy units (SL-TRIAL-*, SL-DEMO-*) found.");
  } else {
    // 1. ReplacedPart (refs ServiceJob, InverterUnit)
    const rp = await ReplacedPart.deleteMany({ inverterUnit: { $in: trialUnitIds } });
    if (rp.deletedCount) console.log(`  Deleted ${rp.deletedCount} ReplacedPart(s).`);

    // 2. ServiceJob (refs InverterUnit)
    const sj = await ServiceJob.deleteMany({ inverterUnit: { $in: trialUnitIds } });
    if (sj.deletedCount) console.log(`  Deleted ${sj.deletedCount} ServiceJob(s).`);

    // 3. PartDispatch (trial: PD-TRIAL-* only)
    const pd = await PartDispatch.deleteMany({ dispatchNumber: /^PD-TRIAL-/ });
    if (pd.deletedCount) console.log(`  Deleted ${pd.deletedCount} PartDispatch(es).`);

    // 4. DealerTransfer (refs InverterUnit)
    const dt = await DealerTransfer.deleteMany({ inverter: { $in: trialUnitIds } });
    if (dt.deletedCount) console.log(`  Deleted ${dt.deletedCount} DealerTransfer(s).`);

    // 5. InverterDispatch (FD-TRIAL-* or containing trial unit ids)
    const dispatches = await InverterDispatch.find({
      $or: [
        { dispatchNumber: /^FD-TRIAL-/ },
        { inverterUnits: { $in: trialUnitIds } },
      ],
    }).lean();
    for (const d of dispatches) {
      await InverterDispatch.deleteOne({ _id: d._id });
    }
    if (dispatches.length) console.log(`  Deleted ${dispatches.length} InverterDispatch(es).`);

    // 6. InverterUnit
    const iu = await InverterUnit.deleteMany({ serialNumber: { $in: DUMMY_SERIALS } });
    if (iu.deletedCount) console.log(`  Deleted ${iu.deletedCount} InverterUnit(s).`);
  }

  // 7. InverterModel SL-TRIAL-4KW
  const im = await InverterModel.deleteOne({ modelCode: "SL-TRIAL-4KW" });
  if (im.deletedCount) console.log("  Deleted model SL-TRIAL-4KW.");

  // 8. Dummy users (do not remove admin@sunlife.com)
  const users = await User.deleteMany({ email: { $in: DUMMY_USER_EMAILS } });
  if (users.deletedCount) console.log(`  Deleted ${users.deletedCount} dummy User(s).`);

  console.log("\n✅ Dummy data removed.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Remove failed:", err);
  process.exit(1);
});
