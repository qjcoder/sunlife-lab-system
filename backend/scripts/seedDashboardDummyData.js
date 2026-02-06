/**
 * Seed dummy data to test all dashboard features.
 *
 * - Ensures Product Catalog has models (incl. one with User Manual + Support Videos)
 * - Adds factory units so stats (Total Products, Available Stock) show
 * - Creates SERVICE_CENTER user and service jobs for service center dashboard
 *
 * Run from backend: node scripts/seedDashboardDummyData.js
 * (Run after seedLifecycleTrialData.js if you want lifecycle + dashboard data)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";
import InverterModel from "../src/models/InverterModel.js";
import InverterUnit from "../src/models/InverterUnit.js";
import ServiceJob from "../src/models/ServiceJob.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB\n");

  const admin = await User.findOne({ role: "FACTORY_ADMIN" });
  if (!admin) {
    console.log("Create an admin first (e.g. run createAdmin.js or seedLifecycleTrialData.js).");
    process.exit(1);
  }

  // ----- 1. SERVICE_CENTER user (for service center dashboard stats) -----
  let scUser = await User.findOne({ role: "SERVICE_CENTER" });
  if (!scUser) {
    scUser = new User({
      name: "Lahore Service Center",
      email: "service.center@sunlife.com",
      role: "SERVICE_CENTER",
      active: true,
    });
    await scUser.setPassword("password");
    await scUser.save();
    console.log("  Created SERVICE_CENTER: service.center@sunlife.com (password: password)");
  } else {
    console.log("  Using existing SERVICE_CENTER user");
  }

  // ----- 2. At least one model with User Manual + Support Videos (for dashboard buttons) -----
  let demoModel = await InverterModel.findOne({ modelCode: "SL-TRIAL-4KW" });
  if (!demoModel) {
    demoModel = await InverterModel.create({
      brand: "Sunlife",
      productLine: "Trial",
      productType: "Inverter",
      variant: "4kW",
      modelCode: "SL-TRIAL-4KW",
      warranty: { partsMonths: 12, serviceMonths: 24 },
      active: true,
      userManualUrl: "https://drive.google.com/file/d/example/view",
      supportVideoLinks: [
        { title: "BMS Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { title: "WIFI VIDEO", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      ],
    });
    console.log("  Created model SL-TRIAL-4KW with User Manual + Support Videos");
  } else {
    if (!demoModel.userManualUrl || !demoModel.supportVideoLinks?.length) {
      demoModel.userManualUrl = demoModel.userManualUrl || "https://drive.google.com/file/d/example/view";
      demoModel.supportVideoLinks = demoModel.supportVideoLinks?.length
        ? demoModel.supportVideoLinks
        : [
            { title: "BMS Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
            { title: "WIFI VIDEO", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          ];
      await demoModel.save();
      console.log("  Updated SL-TRIAL-4KW with User Manual + Support Videos");
    } else {
      console.log("  Model SL-TRIAL-4KW already has User Manual + Support Videos");
    }
  }

  // ----- 3. Factory units (dealer: null) so dashboard stats and card badges show -----
  const factorySerials = ["SL-DEMO-001", "SL-DEMO-002", "SL-DEMO-003", "SL-DEMO-004", "SL-DEMO-005"];
  const existingFactory = await InverterUnit.find({ serialNumber: { $in: factorySerials } }).lean();
  const existingSet = new Set(existingFactory.map((u) => u.serialNumber));

  if (existingSet.size < factorySerials.length) {
    for (const sn of factorySerials) {
      if (existingSet.has(sn)) continue;
      await InverterUnit.create({
        serialNumber: sn,
        inverterModel: demoModel._id,
        dealer: null,
      });
      console.log(`  Created factory unit ${sn}`);
    }
  } else {
    console.log("  Factory demo units (SL-DEMO-001..005) already exist");
  }

  // ----- 4. Service jobs for SERVICE_CENTER dashboard (use a sold unit) -----
  const soldUnit = await InverterUnit.findOne({ saleDate: { $ne: null } })
    .populate("inverterModel")
    .lean();
  if (soldUnit && scUser) {
    const existingJobs = await ServiceJob.find({
      inverterUnit: soldUnit._id,
      serviceCenter: scUser.name,
    }).lean();
    if (existingJobs.length === 0) {
      await ServiceJob.create({
        inverterUnit: soldUnit._id,
        serviceCenter: scUser.name,
        reportedFault: "Display not working",
        visitDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        warrantyStatus: { parts: true, service: true },
        createdBy: scUser._id,
      });
      await ServiceJob.create({
        inverterUnit: soldUnit._id,
        serviceCenter: scUser.name,
        reportedFault: "Fan noise - check",
        visitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        warrantyStatus: { parts: true, service: true },
        createdBy: scUser._id,
      });
      console.log("  Created 2 service jobs for SERVICE_CENTER dashboard");
    } else {
      console.log("  Service jobs for this center already exist");
    }
  } else if (!soldUnit) {
    console.log("  No sold unit found; run seedLifecycleTrialData.js to add sold units + service jobs");
  }

  console.log("\n✅ Dashboard dummy data ready.");
  console.log("\nTo check all dashboard features:");
  console.log("  1. Factory Admin: login admin@sunlife.com / password");
  console.log("     - Stats: Total Products, Available Stock (factory units)");
  console.log("     - Product Catalog: open a variant → Technical Datasheet, User Manual, Support Videos, Full Life Cycle View");
  console.log("  2. Service Center: login service.center@sunlife.com / password");
  console.log("     - Stats: Total Service Jobs");
  console.log("  3. Run seedLifecycleTrialData.js first if you want lifecycle + more sold/service data.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
