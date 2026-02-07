/**
 * Seed dummy parts for viewing the Create Parts / Parts count by model UI.
 * Requires existing InverterModels (run seedModels.js first).
 *
 * Run from backend: node scripts/seedParts.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from '../src/models/InverterModel.js';
import Part from '../src/models/Part.js';

dotenv.config();

const DUMMY_PARTS_BY_MODEL = [
  // Inverters – match by productLine + variant (or modelCode)
  {
    match: { productLine: 'SL-SKY ULTRA', variant: '11KW' },
    parts: [
      { partCode: 'MB-11KW-V2', partName: 'Main Board 11kW', description: 'Main control board' },
      { partCode: 'DSP-11KW', partName: 'DSP Module', description: 'Digital signal processor' },
      { partCode: 'LCD-11KW', partName: 'LCD Display', description: 'Front panel display' },
    ],
  },
  {
    match: { productLine: 'SL-ULTRA PLUS', variant: '11KW' },
    parts: [
      { partCode: 'MB-U11-V1', partName: 'Main Board Ultra 11kW', description: 'Main board' },
      { partCode: 'FAN-11KW', partName: 'Cooling Fan 11kW', description: 'Thermal fan' },
    ],
  },
  {
    match: { productLine: 'SL-SKY ULTRA', variant: '8KW' },
    parts: [
      { partCode: 'MB-8KW-V2', partName: 'Main Board 8kW', description: 'Main control board' },
      { partCode: 'LCD-8KW', partName: 'LCD Display 8kW', description: 'Front panel' },
    ],
  },
  {
    match: { productLine: 'SL IV', variant: '6.2kW' },
    parts: [
      { partCode: 'MB-IV-6R2', partName: 'SL IV Main Board 6.2kW', description: 'Main board' },
    ],
  },
  {
    match: { productLine: 'SKY PLUS', variant: '6KW' },
    parts: [
      { partCode: 'MB-SKY6', partName: 'Sky Plus 6kW Main Board', description: 'Main board' },
      { partCode: 'KEYPAD-SKY6', partName: 'Keypad Assembly', description: 'User interface' },
    ],
  },
  {
    match: { productLine: 'SL Premium', variant: '3kW' },
    parts: [
      { partCode: 'MB-PREM-3K', partName: 'Premium 3kW Main Board', description: 'Main board' },
    ],
  },
  // Batteries
  {
    match: { productLine: 'Lithium', variant: 'RM 51.2V 100AH' },
    parts: [
      { partCode: 'BMS-51V100', partName: 'BMS 51.2V 100AH', description: 'Battery management system' },
      { partCode: 'CELL-51V100', partName: 'Cell Module', description: 'Cell assembly' },
    ],
  },
  {
    match: { productLine: 'Lithium', variant: 'SL-48100M' },
    parts: [
      { partCode: 'BMS-48100', partName: 'BMS SL-48100M', description: 'BMS module' },
    ],
  },
  // VFD
  {
    match: { productLine: 'VFD', variant: 'SL-GD170-5R5-4-PV' },
    parts: [
      { partCode: 'VFD-5R5-DRV', partName: 'Drive Board 5.5kW', description: 'Drive module' },
      { partCode: 'VFD-5R5-PWR', partName: 'Power Board', description: 'Power stage' },
    ],
  },
  {
    match: { productLine: 'VFD', variant: 'SL-GD170-030-4-PV' },
    parts: [
      { partCode: 'VFD-30-DRV', partName: 'Drive Board 30kW', description: 'Drive module' },
    ],
  },
];

async function seedParts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;

    for (const { match, parts } of DUMMY_PARTS_BY_MODEL) {
      const model = await InverterModel.findOne(match);
      if (!model) {
        console.log(`⏭ Skipped (model not found): ${JSON.stringify(match)}`);
        skipped += parts.length;
        continue;
      }

      for (const { partCode, partName, description } of parts) {
        const existing = await Part.findOne({
          inverterModel: model._id,
          partCode,
        });
        if (existing) {
          skipped++;
          continue;
        }
        await Part.create({
          inverterModel: model._id,
          partCode,
          partName,
          description: description || '',
        });
        console.log(`✅ ${model.productLine} ${model.variant}: ${partCode} – ${partName}`);
        created++;
      }
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped (already exist or model missing).`);
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedParts();
