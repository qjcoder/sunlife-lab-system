/**
 * Migration script to update existing InverterModel documents
 * with the modelName field computed from brand + productLine + variant
 * 
 * Run this once to populate modelName for existing models:
 * node updateModelNames.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const updateModelNames = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all models without modelName or with empty modelName
    const models = await InverterModel.find({
      $or: [
        { modelName: { $exists: false } },
        { modelName: '' },
        { modelName: null }
      ]
    });

    console.log(`Found ${models.length} models to update`);

    // Update each model
    let updated = 0;
    for (const model of models) {
      if (model.brand && model.productLine && model.variant) {
        const modelName = `${model.brand} ${model.productLine} ${model.variant}`.trim();
        await InverterModel.updateOne(
          { _id: model._id },
          { $set: { modelName } }
        );
        console.log(`Updated ${model.modelCode}: ${modelName}`);
        updated++;
      }
    }

    console.log(`\n✅ Successfully updated ${updated} models`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating model names:', error);
    process.exit(1);
  }
};

updateModelNames();
