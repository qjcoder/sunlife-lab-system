/**
 * Script to fix the IP65 model image path to use hi-6k-sl.jpg
 * 
 * Run: node fixIP65Image.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const fixIP65Image = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all IP65 models (could have different model codes)
    // Also check for HI-6K-SL which might be the actual model code in DB
    const models = await InverterModel.find({
      $or: [
        { modelCode: '6KW-IP65' },
        { modelCode: 'HI-6K-SL' },
        { modelCode: /6KW.*IP65/i },
        { modelCode: /HI-6K-SL/i },
        { modelCode: /HI.*6K.*SL/i },
        { productLine: /IP65/i },
        { productLine: /Ip65/i },
        { variant: /6kW/i },
        { variant: /6KW/i },
        { modelName: /IP65/i },
        { modelName: /Ip65/i },
        { modelName: /6kW.*IP65/i },
        { modelName: /6KW.*IP65/i }
      ]
    });

    if (models.length === 0) {
      console.log('❌ No IP65 model found.');
      process.exit(1);
    }

    console.log(`Found ${models.length} IP65 model(s):\n`);

    for (const model of models) {
      console.log(`Current model:`);
      console.log(`   Model Code: ${model.modelCode}`);
      console.log(`   Model Name: ${model.modelName || 'N/A'}`);
      console.log(`   Current Image: ${model.image || 'N/A'}`);
      console.log(`   Brand: ${model.brand}`);
      console.log(`   Product Line: ${model.productLine}`);
      console.log(`   Variant: ${model.variant}`);
      
      // Update image to use hi-6k-sl.jpg (the actual filename)
      const imagePath = `/products/hi-6k-sl.jpg`;
      
      // Also ensure modelName is correct
      const modelName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();
      
      await InverterModel.updateOne(
        { _id: model._id },
        { 
          $set: { 
            image: imagePath,
            modelName: modelName
          } 
        }
      );
      
      console.log(`\n✅ Updated:`);
      console.log(`   Image Path: ${imagePath}`);
      console.log(`   Model Name: ${modelName}\n`);
    }

    console.log('✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing IP65 image:', error);
    process.exit(1);
  }
};

fixIP65Image();
