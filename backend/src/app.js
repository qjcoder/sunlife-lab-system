import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serviceJobRoutes from "./routes/serviceJobRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/service-jobs", serviceJobRoutes);
app.use("/api/auth", authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

export default app;