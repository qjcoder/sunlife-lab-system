/**
 * Script to remove MPPT Controller models (800W and 1600W) from the database
 * 
 * Run: node scripts/removeMPPTControllers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from '../src/models/InverterModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model codes for MPPT controllers to remove
const mpptModelCodes = [
  'MPPT-SOLAR-INVERTER-800W',
  'mppt-solar-inverter-800w',
  'MPPT-SOLAR-INVERTER-1600W',
  'mppt-solar-inverter-1600w',
];

// Image file paths to delete
const imageFiles = [
  'mppt-solar-inverter-800w.jpg',
  'mppt-solar-inverter-1600w.jpg',
];

const removeMPPTControllers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    let deleted = 0;
    let notFound = 0;

    // Find and delete models
    for (const modelCode of mpptModelCodes) {
      const model = await InverterModel.findOne({ 
        $or: [
          { modelCode: modelCode },
          { modelCode: modelCode.toUpperCase() },
          { modelCode: modelCode.toLowerCase() },
        ]
      });

      if (model) {
        await InverterModel.findByIdAndDelete(model._id);
        console.log(`✅ Deleted: ${model.modelName} (${model.modelCode})`);
        deleted++;
      } else {
        // Also try searching by model name
        const modelByName = await InverterModel.findOne({
          $or: [
            { modelName: { $regex: /mppt.*800w/i } },
            { modelName: { $regex: /mppt.*1600w/i } },
            { variant: { $regex: /800w/i } },
            { variant: { $regex: /1600w/i } },
          ],
          productLine: { $regex: /mppt/i }
        });

        if (modelByName) {
          await InverterModel.findByIdAndDelete(modelByName._id);
          console.log(`✅ Deleted: ${modelByName.modelName} (${modelByName.modelCode})`);
          deleted++;
        } else {
          console.log(`⏭️  Not found: ${modelCode}`);
          notFound++;
        }
      }
    }

    // Delete image files
    const productsDir = path.join(__dirname, '../../frontend/public/products');
    let imagesDeleted = 0;

    for (const imageFile of imageFiles) {
      const imagePath = path.join(productsDir, imageFile);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`✅ Deleted image: ${imageFile}`);
          imagesDeleted++;
        } else {
          console.log(`⏭️  Image not found: ${imageFile}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting image ${imageFile}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Models deleted: ${deleted}`);
    console.log(`   Models not found: ${notFound}`);
    console.log(`   Images deleted: ${imagesDeleted}`);
    console.log('\n✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing MPPT controllers:', error);
    process.exit(1);
  }
};

removeMPPTControllers();
