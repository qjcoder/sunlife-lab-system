import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';

// 🔴 FORCE MODEL REGISTRATION (IMPORTANT)
import './models/InverterModel.js';
import './models/ModelPart.js';
import './models/InverterUnit.js';
import './models/ServiceJob.js';
import './models/ReplacedPart.js';
import "./models/User.js";
import './models/InstallerProgram.js';
import './models/RewardRule.js';
import './models/PointsMilestone.js';
import './models/InstallationSubmission.js';

dotenv.config();

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });