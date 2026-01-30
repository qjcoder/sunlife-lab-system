import mongoose from "mongoose";
import dotenv from "dotenv";

import ProductLine from "../models/ProductLine.js";
import InverterModel from "../models/InverterModel.js";
import InverterUnit from "../models/InverterUnit.js";

dotenv.config();

const runSeed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Connected to DB for seeding");

  // 1️⃣ Product Line
  const productLine = await ProductLine.create({
    name: "Sunlife Sky",
    description: "Sunlife Sky inverter series"
  });

  // 2️⃣ Inverter Model
  const inverterModel = await InverterModel.create({
    productLine: productLine._id,
    modelCode: "SL-SKY-4KW",
    displayName: "Sunlife Sky 4kW",
    ratedPowerKW: 4,
    warranty: {
      partsMonths: 12,
      serviceMonths: 24
    }
  });

  // 3️⃣ Inverter Unit (Sold device)
  const inverterUnit = await InverterUnit.create({
    serialNumber: "SL-SKY-4KW-0001",
    inverterModel: inverterModel._id,
    saleInvoiceNo: "INV-2026-001",
    saleDate: new Date("2025-07-01"),
    customerName: "Ali Raza",
    customerContact: "0300-1234567"
  });

  console.log("Seed completed:");
  console.log({
    productLine: productLine.name,
    inverterModel: inverterModel.displayName,
    serialNumber: inverterUnit.serialNumber
  });

  process.exit();
};

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});