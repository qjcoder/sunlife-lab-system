import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// --------------------
// Route imports
// --------------------
import authRoutes from "./routes/authRoutes.js";               // Auth & login
import serviceJobRoutes from "./routes/serviceJobRoutes.js";   // Service jobs + replacements
import inverterRoutes from "./routes/inverterRoutes.js";       // Inverter lifecycle (D3)
import stockRoutes from "./routes/stockRoutes.js";             // Service center stock (D4–4)
import inverterModelRoutes from "./routes/inverterModelRoutes.js"
import inverterDispatchRoutes from "./routes/inverterDispatchRoutes.js";
import inverterSaleRoutes from "./routes/inverterSaleRoutes.js";
import serviceCenterRoutes from "./routes/serviceCenterRoutes.js";



dotenv.config();

const app = express();

/**
 * ----------------------------------------------------
 * Global Middlewares
 * ----------------------------------------------------
 */
app.use(cors());            // Enable CORS for frontend / Postman
app.use(express.json());    // Parse JSON request bodies

/**
 * ----------------------------------------------------
 * API Routes
 * ----------------------------------------------------
 */

// Authentication & token issuance
app.use("/api/auth", authRoutes);


//InverterModel Creation
app.use("/api/inverter-models", inverterModelRoutes);

//Inverter Dispatched to Dealer
app.use("/api/inverter-dispatches", inverterDispatchRoutes);

// Dealer to Customer Inverter Sale
app.use("/api/inverter-sales", inverterSaleRoutes);

//Service Center User Creation
app.use("/api/service-centers", serviceCenterRoutes);

// Service jobs (D1, D2) + replaced parts (D4–3)
app.use("/api/service-jobs", serviceJobRoutes);

// Inverter lifecycle (Factory → Sale → Service → Replacement)
app.use("/api/inverters", inverterRoutes);

// Service center stock balance (Dispatch − Consumption)
app.use("/api/stock", stockRoutes);

/**
 * ----------------------------------------------------
 * Health check
 * Used for uptime monitoring & diagnostics
 * ----------------------------------------------------
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date(),
  });
});

export default app;