/**
 * Script to update existing InverterModel documents with image paths
 * 
 * Run: node updateModelImages.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const updateModelImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all models without image or with empty image
    const models = await InverterModel.find({
      $or: [
        { image: { $exists: false } },
        { image: '' },
        { image: null }
      ]
    });

    console.log(`Found ${models.length} models to update\n`);

    let updated = 0;
    for (const model of models) {
      if (model.modelCode) {
        // Generate image path: modelCode lowercase + .jpg
        const imagePath = `/products/${model.modelCode.toLowerCase()}.jpg`;
        
        await InverterModel.updateOne(
          { _id: model._id },
          { $set: { image: imagePath } }
        );
        
        console.log(`✅ Updated: ${model.modelName || model.modelCode} -> ${imagePath}`);
        updated++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${models.length}`);
    console.log('\n✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating model images:', error);
    process.exit(1);
  }
};

updateModelImages();
