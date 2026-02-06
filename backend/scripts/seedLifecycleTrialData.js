/**
 * Seed dummy trial data for Full Life Cycle View testing.
 *
 * Creates:
 * - 1 trial inverter model (SL-TRIAL-4KW)
 * - 4 units: direct factory sale, dealer→sub-dealer→sale, sold+service visits, factory-only
 * - Factory dispatch, dealer transfer, part dispatch, service jobs, replaced parts
 *
 * Run from backend folder: node scripts/seedLifecycleTrialData.js
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

const SERIAL_PREFIX = "SL-TRIAL";

async function getOrCreateAdmin() {
  let admin = await User.findOne({ role: "FACTORY_ADMIN" });
  if (!admin) {
    admin = new User({
      name: "Factory Admin",
      email: "admin@sunlife.com",
      role: "FACTORY_ADMIN",
      active: true,
    });
    await admin.setPassword("password");
    await admin.save();
    console.log("  Created FACTORY_ADMIN: admin@sunlife.com");
  }
  return admin;
}

async function getOrCreateDealerUsers(adminId) {
  let dealer = await User.findOne({ email: "dealer.trial@sunlife.com" });
  if (!dealer) {
    dealer = new User({
      name: "Demo Dealer",
      email: "dealer.trial@sunlife.com",
      role: "DEALER",
      active: true,
    });
    await dealer.setPassword("password");
    await dealer.save();
    console.log("  Created DEALER: dealer.trial@sunlife.com");
  }

  let subDealer = await User.findOne({ email: "subdealer.trial@sunlife.com" });
  if (!subDealer) {
    subDealer = new User({
      name: "Demo Sub-Dealer",
      email: "subdealer.trial@sunlife.com",
      role: "SUB_DEALER",
      parentDealer: dealer._id,
      active: true,
    });
    await subDealer.setPassword("password");
    await subDealer.save();
    console.log("  Created SUB_DEALER: subdealer.trial@sunlife.com");
  }

  return { dealer, subDealer };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB\n");

  const admin = await getOrCreateAdmin();
  const { dealer, subDealer } = await getOrCreateDealerUsers(admin._id);

  // ----- 1. Trial model -----
  let model = await InverterModel.findOne({ modelCode: "SL-TRIAL-4KW" });
  if (!model) {
    model = await InverterModel.create({
      brand: "Sunlife",
      productLine: "Trial",
      productType: "Inverter",
      variant: "4kW",
      modelCode: "SL-TRIAL-4KW",
      warranty: { partsMonths: 12, serviceMonths: 24 },
      active: true,
    });
    console.log("  Created model: SL-TRIAL-4KW");
  } else {
    console.log("  Using existing model: SL-TRIAL-4KW");
  }

  const baseDate = new Date("2025-01-01");

  // ----- 2. Units (avoid duplicate serials) -----
  const serials = [
    `${SERIAL_PREFIX}-001`,
    `${SERIAL_PREFIX}-002`,
    `${SERIAL_PREFIX}-003`,
    `${SERIAL_PREFIX}-004`,
  ];

  const existingUnits = await InverterUnit.find({ serialNumber: { $in: serials } }).lean();
  const existingSerials = new Set(existingUnits.map((u) => u.serialNumber));

  if (existingSerials.size === serials.length) {
    console.log("  Trial units already exist. Skipping unit creation.");
  } else {
    // Unit 001: Direct factory sale (no dispatch)
    if (!existingSerials.has(serials[0])) {
      await InverterUnit.create({
        serialNumber: serials[0],
        inverterModel: model._id,
        saleInvoiceNo: "INV-DIRECT-001",
        saleDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        customerName: "Ahmed Khan",
        customerContact: "+92 300 1112233",
      });
      console.log("  Created unit SL-TRIAL-001 (direct factory sale)");
    }

    // Unit 002: Factory → Dealer → Sub-dealer → Sale
    if (!existingSerials.has(serials[1])) {
      const unit002 = await InverterUnit.create({
        serialNumber: serials[1],
        inverterModel: model._id,
      });
      const dispatch002 = await InverterDispatch.create({
        dispatchNumber: "FD-TRIAL-002",
        dealer: "Sunlife Dealer North",
        inverterUnits: [unit002._id],
        dispatchedBy: admin._id,
        dispatchDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        remarks: "Trial dispatch",
      });
      await InverterUnit.updateOne(
        { _id: unit002._id },
        { $set: { dispatch: dispatch002._id, dealer: "Sunlife Dealer North" } }
      );

      await DealerTransfer.create({
        inverter: unit002._id,
        serialNumber: serials[1],
        fromDealer: dealer._id,
        toSubDealer: subDealer._id,
        transferredBy: dealer._id,
        remarks: "Trial transfer to sub-dealer",
      });

      await InverterUnit.updateOne(
        { _id: unit002._id },
        {
          $set: {
            dealer: "Demo Sub-Dealer",
            saleInvoiceNo: "INV-SUB-002",
            saleDate: new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000),
            customerName: "Sara Ali",
            customerContact: "+92 321 4445566",
          },
        }
      );
      console.log("  Created unit SL-TRIAL-002 (dealer → sub-dealer → sold)");
    }

    // Unit 003: Dispatched, sold, then 2 service visits with replaced parts
    if (!existingSerials.has(serials[2])) {
      const unit003 = await InverterUnit.create({
        serialNumber: serials[2],
        inverterModel: model._id,
      });
      const dispatch003 = await InverterDispatch.create({
        dispatchNumber: "FD-TRIAL-003",
        dealer: "Sunlife Dealer Central",
        inverterUnits: [unit003._id],
        dispatchedBy: admin._id,
        dispatchDate: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      });
      await InverterUnit.updateOne(
        { _id: unit003._id },
        {
          $set: {
            dispatch: dispatch003._id,
            dealer: null,
            saleInvoiceNo: "INV-003",
            saleDate: new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000),
            customerName: "Hassan Raza",
            customerContact: "+92 333 7778899",
          },
        }
      );

      // Part dispatch to service center (for ReplacedPart.dispatch)
      const partDispatch1 = await PartDispatch.create({
        dispatchNumber: "PD-TRIAL-SC1-001",
        serviceCenter: "Lahore Service Center",
        dispatchedItems: [
          { partCode: "MB-4KW-V2", partName: "Main Board 4kW", quantity: 5 },
          { partCode: "FAN-40", partName: "Cooling Fan 40mm", quantity: 10 },
        ],
        dispatchedBy: admin._id,
        dispatchDate: new Date(baseDate.getTime() + 70 * 24 * 60 * 60 * 1000),
        remarks: "Trial parts for service",
      });

      const partDispatch2 = await PartDispatch.create({
        dispatchNumber: "PD-TRIAL-SC1-002",
        serviceCenter: "Lahore Service Center",
        dispatchedItems: [
          { partCode: "CAP-1000", partName: "Capacitor 1000uF", quantity: 20 },
        ],
        dispatchedBy: admin._id,
        dispatchDate: new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000),
      });

      const job1 = await ServiceJob.create({
        inverterUnit: unit003._id,
        serviceCenter: "Lahore Service Center",
        reportedFault: "No display, unit not powering on",
        visitDate: new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        warrantyStatus: { parts: true, service: true },
        createdBy: admin._id,
      });

      await ReplacedPart.create({
        serviceJob: job1._id,
        inverterUnit: unit003._id,
        partCode: "MB-4KW-V2",
        partName: "Main Board 4kW",
        quantity: 1,
        replacementDate: new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        replacementType: "REPLACEMENT",
        dispatch: partDispatch1._id,
        costLiability: "FACTORY",
        warrantyClaimEligible: true,
      });

      await ReplacedPart.create({
        serviceJob: job1._id,
        inverterUnit: unit003._id,
        partCode: "FAN-40",
        partName: "Cooling Fan 40mm",
        quantity: 1,
        replacementDate: new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        replacementType: "REPLACEMENT",
        dispatch: partDispatch1._id,
        costLiability: "FACTORY",
        warrantyClaimEligible: true,
      });

      const job2 = await ServiceJob.create({
        inverterUnit: unit003._id,
        serviceCenter: "Lahore Service Center",
        reportedFault: "Fan noise, overheating under load",
        visitDate: new Date(baseDate.getTime() + 130 * 24 * 60 * 60 * 1000),
        warrantyStatus: { parts: true, service: true },
        createdBy: admin._id,
      });

      await ReplacedPart.create({
        serviceJob: job2._id,
        inverterUnit: unit003._id,
        partCode: "CAP-1000",
        partName: "Capacitor 1000uF",
        quantity: 2,
        replacementDate: new Date(baseDate.getTime() + 130 * 24 * 60 * 60 * 1000),
        replacementType: "REPLACEMENT",
        dispatch: partDispatch2._id,
        costLiability: "FACTORY",
        warrantyClaimEligible: true,
      });

      console.log("  Created unit SL-TRIAL-003 (sold + 2 service visits with replaced parts)");
    }

    // Unit 004: Still at factory (no dispatch, no sale)
    if (!existingSerials.has(serials[3])) {
      await InverterUnit.create({
        serialNumber: serials[3],
        inverterModel: model._id,
      });
      console.log("  Created unit SL-TRIAL-004 (factory only)");
    }
  }

  console.log("\n✅ Lifecycle trial data ready.");
  console.log("\nTo test Full Life Cycle View:");
  console.log("  1. Login as admin@sunlife.com / password");
  console.log("  2. Dashboard → pick product model SL-TRIAL-4KW (Trial 4kW) → click variant 4kW");
  console.log("  3. Click 'Full Life Cycle View' → select a unit:");
  console.log("     - SL-TRIAL-001: Direct factory sale (no dealer)");
  console.log("     - SL-TRIAL-002: Dealer → Sub-dealer → Customer");
  console.log("     - SL-TRIAL-003: Dealer → Customer + 2 service visits (replaced parts)");
  console.log("     - SL-TRIAL-004: At factory only");
  console.log("\nOr open directly: /lifecycle/SL-TRIAL-001 or /lifecycle/SL-TRIAL-003");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
