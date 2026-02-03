/**
 * Script to update the "SL 2.0kW" model with correct image path (sl-2r0kw.jpeg)
 * 
 * Run: node updateSL2R0KWImage.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const updateSL2R0KWImage = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find the SL 2.0kW model (could have different model codes)
    const models = await InverterModel.find({
      $or: [
        { modelCode: 'SL-2R0KW' },
        { modelCode: /SL.*2R0KW/i },
        { modelCode: /SL.*2-0KW/i },
        { variant: /2\.0kW/i },
        { variant: /2.0kW/i },
        { variant: /2R0kW/i },
        { modelName: /2\.0kW/i },
        { modelName: /2.0kW/i }
      ]
    });

    if (models.length === 0) {
      console.log('❌ No SL 2.0kW model found.');
      process.exit(1);
    }

    console.log(`Found ${models.length} SL 2.0kW model(s):\n`);

    for (const model of models) {
      console.log(`Current model:`);
      console.log(`   Model Code: ${model.modelCode}`);
      console.log(`   Model Name: ${model.modelName || 'N/A'}`);
      console.log(`   Current Image: ${model.image || 'N/A'}`);
      console.log(`   Brand: ${model.brand}`);
      console.log(`   Product Line: ${model.productLine}`);
      console.log(`   Variant: ${model.variant}`);
      
      // Update image to use sl-2r0kw.jpeg
      const imagePath = `/products/sl-2r0kw.jpeg`;
      
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
    console.error('❌ Error updating SL 2.0kW image:', error);
    process.exit(1);
  }
};

updateSL2R0KWImage();
