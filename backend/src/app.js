import express from "express";
import cors from "cors";
import dotenv from "dotenv";

/**
 * ====================================================
 * Route Imports
 * ====================================================
 * Each route group represents a clear business module.
 * Naming reflects domain intent (no generic routes).
 */

// Authentication & user login (Admin / Dealer / Service Center)
import authRoutes from "./routes/authRoutes.js";

// Inverter master data (Brand / Product Line / Variant)
import inverterModelRoutes from "./routes/inverterModelRoutes.js";

// Factory → Dealer inverter dispatch (physical units)
import inverterDispatchRoutes from "./routes/inverterDispatchRoutes.js";

//Dealer Inverter Stock Details
import inverterStockRoutes from "./routes/inverterStockRoutes.js";


// Dealer → Customer inverter sale (warranty starts here)
import inverterSaleRoutes from "./routes/inverterSaleRoutes.js";

// Inverter lifecycle view (Factory → Sale → Service → Replacement)
import inverterRoutes from "./routes/inverterRoutes.js";

// Factory → Service Center spare parts dispatch
import partDispatchRoutes from "./routes/partDispatchRoutes.js";

// Service Center stock (derived from dispatch − replacement)
import serviceCenterStockRoutes from "./routes/serviceCenterStockRoutes.js";

// Service job management + replaced parts (nested)
import serviceJobRoutes from "./routes/serviceJobRoutes.js";

// Service Center account creation (Admin only)
import serviceCenterRoutes from "./routes/serviceCenterRoutes.js";

// Dealer account creation (Admin only)
import dealerRoutes from "./routes/dealerRoutes.js";

dotenv.config();

const app = express();

/**
 * ====================================================
 * Global Middlewares
 * ====================================================
 */

// Enable CORS (frontend, Postman, integrations)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

/**
 * ====================================================
 * API Routes
 * ====================================================
 */

// 🔐 Authentication & token issuance
app.use("/api/auth", authRoutes);

// 🏭 Inverter models (Factory master data)
app.use("/api/inverter-models", inverterModelRoutes);

// 🚚 Inverter dispatches (Factory → Dealer)
app.use("/api/inverter-dispatches", inverterDispatchRoutes);

// Inverter physical stock (Factory / Dealer)
app.use("/api/inverter-stock", inverterStockRoutes);

// 💰 Dealer → Customer inverter sale
app.use("/api/inverter-sales", inverterSaleRoutes);

// 🔍 Inverter lifecycle API
app.use("/api/inverters", inverterRoutes);

// 📦 Spare parts dispatch (Factory → Service Center)
app.use("/api/part-dispatches", partDispatchRoutes);

// 📊 Service center spare parts stock
app.use("/api/service-center-stock", serviceCenterStockRoutes);

// 🛠 Service jobs + replaced parts
app.use("/api/service-jobs", serviceJobRoutes);

// 👷 Service center account management
app.use("/api/service-centers", serviceCenterRoutes);

// 🏪 Dealer account management
app.use("/api/dealers", dealerRoutes);

/**
 * ====================================================
 * Health Check
 * ====================================================
 * Used for uptime monitoring & diagnostics
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date(),
  });
});

export default app;