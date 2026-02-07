import express from "express";
import cors from "cors";
import dotenv from "dotenv";

/**
 * ====================================================
 * Environment Setup
 * ====================================================
 */
dotenv.config();

const app = express();

/**
 * ====================================================
 * Global Middlewares
 * ====================================================
 */
app.use(cors());
app.use(express.json());

/**
 * ====================================================
 * Route Imports (Domain-Based Architecture)
 * Order strictly follows REAL inverter lifecycle
 * ====================================================
 */

// 🔐 Authentication
import authRoutes from "./routes/authRoutes.js";

// 👤 Account Management
import dealerRoutes from "./routes/dealerRoutes.js";
import serviceCenterRoutes from "./routes/serviceCenterRoutes.js";
import operatorRoutes from "./routes/operatorRoutes.js";
import installerProgramManagerRoutes from "./routes/installerProgramManagerRoutes.js";

// 🏭 Factory Master Data
import inverterModelRoutes from "./routes/inverterModelRoutes.js";

// 🏭 Factory → Physical Inverter Registration
import inverterRoutes from "./routes/inverterRoutes.js";

// 🚚 Physical Inverter Movement
// Factory → Dealer
import inverterDispatchRoutes from "./routes/inverterDispatchRoutes.js";

// Dealer → Sub-Dealer
import dealerTransferRoutes from "./routes/dealerTransferRoutes.js";

// 📦 Stock Views (READ-ONLY)
import factoryInverterStockRoutes from "./routes/factoryInverterStockRoutes.js";
import dealerInverterStockRoutes from "./routes/dealerInverterStockRoutes.js";

// 💰 Sales (Warranty STARTS here)
import inverterSaleRoutes from "./routes/inverterSaleRoutes.js";

// 📦 Spare Parts Flow
import partRoutes from "./routes/partRoutes.js";
import partDispatchRoutes from "./routes/partDispatchRoutes.js";
import serviceCenterStockRoutes from "./routes/serviceCenterStockRoutes.js";

// 🛠 Service & Warranty
import serviceJobRoutes from "./routes/serviceJobRoutes.js";

// 📝 Operator Serial Entry
import operatorSerialEntryRoutes from "./routes/operatorSerialEntryRoutes.js";

/**
 * ====================================================
 * API Route Registration
 * ====================================================
 */

// 🔐 Authentication
app.use("/api/auth", authRoutes);

// 👤 Accounts & Hierarchy
app.use("/api/dealers", dealerRoutes);
app.use("/api/service-centers", serviceCenterRoutes);
app.use("/api/operators", operatorRoutes);
app.use("/api/installer-program-managers", installerProgramManagerRoutes);

// 🏭 Inverter Models
app.use("/api/inverter-models", inverterModelRoutes);

// 🏭 Inverter Registration
app.use("/api/inverters", inverterRoutes);

// 🚚 Factory → Dealer Dispatch
app.use("/api/inverter-dispatches", inverterDispatchRoutes);

// 🔁 Dealer → Sub-Dealer Transfer
app.use("/api/dealer-transfers", dealerTransferRoutes);

// 📦 Stock Views
app.use("/api/factory-inverter-stock", factoryInverterStockRoutes);
app.use("/api/dealer-inverter-stock", dealerInverterStockRoutes);

// 💰 Sales (Dealer / Sub-Dealer / Factory)
app.use("/api/inverter-sales", inverterSaleRoutes);

// 📦 Spare Parts
app.use("/api/parts", partRoutes);
app.use("/api/part-dispatches", partDispatchRoutes);
app.use("/api/service-center-stock", serviceCenterStockRoutes);

// 🛠 Service Jobs & Replacements
app.use("/api/service-jobs", serviceJobRoutes);

// 📝 Operator Serial Entry
app.use("/api/operator/serial-entry", operatorSerialEntryRoutes);

/**
 * ====================================================
 * Health Check
 * ====================================================
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date(),
  });
});

export default app;