/**
 * Script to update the "Sunlife 6kW Ip65" model with correct modelName and image
 * 
 * Run: node updateIP65Model.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const updateIP65Model = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find the IP65 model (could be "6KW IP65" or "Sunlife 6kW Ip65")
    const models = await InverterModel.find({
      $or: [
        { modelCode: '6KW-IP65' },
        { modelCode: /6KW.*IP65/i },
        { productLine: /IP65/i },
        { variant: /6kW/i }
      ]
    });

    if (models.length === 0) {
      console.log('❌ No IP65 model found. Please run seedModels.js first.');
      process.exit(1);
    }

    for (const model of models) {
      // Update modelName
      const modelName = `${model.brand} ${model.productLine} ${model.variant}`.trim();
      
      // Update image path - use the actual filename hi-6k-sl.jpg
      const imagePath = `/products/hi-6k-sl.jpg`;
      
      await InverterModel.updateOne(
        { _id: model._id },
        { 
          $set: { 
            modelName: modelName,
            image: imagePath
          } 
        }
      );
      
      console.log(`✅ Updated model:`);
      console.log(`   Model Code: ${model.modelCode}`);
      console.log(`   Model Name: ${modelName}`);
      console.log(`   Image Path: ${imagePath}`);
      console.log(`   Brand: ${model.brand}`);
      console.log(`   Product Line: ${model.productLine}`);
      console.log(`   Variant: ${model.variant}\n`);
    }

    console.log('✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating IP65 model:', error);
    process.exit(1);
  }
};

updateIP65Model();
