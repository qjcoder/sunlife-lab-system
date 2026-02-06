/**
 * Script to restore MPPT Controller models (800W and 1600W) to the database
 * 
 * Run: node scripts/restoreMPPTControllers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from '../src/models/InverterModel.js';

dotenv.config();

const mpptModels = [
  {
    brand: 'Sunlife',
    productLine: 'MPPT SOLAR INVERTER',
    variant: '800W',
    modelCode: 'MPPT-SOLAR-INVERTER-800W',
    modelName: 'Sunlife MPPT SOLAR INVERTER 800W',
    image: '/products/mppt-solar-inverter-800w.jpg',
  },
  {
    brand: 'Sunlife',
    productLine: 'MPPT SOLAR INVERTER',
    variant: '1600W',
    modelCode: 'MPPT-SOLAR-INVERTER-1600W',
    modelName: 'Sunlife MPPT SOLAR INVERTER 1600W',
    image: '/products/mppt-solar-inverter-1600w.jpg',
  },
];

const restoreMPPTControllers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;

    for (const modelData of mpptModels) {
      // Check if model already exists
      const existing = await InverterModel.findOne({ 
        modelCode: modelData.modelCode 
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${modelData.modelName} (already exists)`);
        skipped++;
        continue;
      }

      // Create model
      await InverterModel.create({
        ...modelData,
        warranty: {
          partsMonths: 12,
          serviceMonths: 24,
        },
        active: true,
      });

      console.log(`✅ Restored: ${modelData.modelName} (${modelData.modelCode})`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${mpptModels.length}`);
    console.log('\n✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error restoring MPPT controllers:', error);
    process.exit(1);
  }
};

restoreMPPTControllers();
