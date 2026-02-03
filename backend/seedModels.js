/**
 * Script to seed inverter models into the database
 * 
 * Run: node seedModels.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InverterModel from './src/models/InverterModel.js';

dotenv.config();

const models = [
  // Inverters
  { type: 'Inverter', name: 'Sunpro 1.5kW' },
  { type: 'Inverter', name: 'SL 2.0kW' },
  { type: 'Inverter', name: 'Sunpro 3kW' },
  { type: 'Inverter', name: 'SL Premium 3kW' },
  { type: 'Inverter', name: 'Sunpro 3.5kW' },
  { type: 'Inverter', name: 'SL Royal 4kW' },
  { type: 'Inverter', name: 'SL Royal 6kW' },
  { type: 'Inverter', name: 'SL ELITE 6kW' },
  { type: 'Inverter', name: 'SL IV 4.2kW' },
  { type: 'Inverter', name: 'SL IV 6.2kW' },
  { type: 'Inverter', name: 'SL PLUS 4kW' },
  { type: 'Inverter', name: 'SL PLUS 6kW' },
  { type: 'Inverter', name: 'SL PLUS 6KW' },
  { type: 'Inverter', name: 'SKY PLUS 4KW' },
  { type: 'Inverter', name: 'SKY PLUS 6KW' },
  { type: 'Inverter', name: 'SL-INFINI ULTRA 6KW' },
  { type: 'Inverter', name: 'HI-6K-SL' },
  { type: 'Inverter', name: 'SL-SKY ULTRA 8KW' },
  { type: 'Inverter', name: 'SL-SKY ULTRA 11KW' },
  { type: 'Inverter', name: 'SL-ULTRA PLUS 8KW' },
  { type: 'Inverter', name: 'SL-ULTRA PLUS 11KW' },
  { type: 'Inverter', name: 'SL IV SKY 8KW' },
  { type: 'Inverter', name: 'SL IV SKY 11KW' },
  { type: 'Inverter', name: 'SL IV SKY 6KW' },
  
  // Batteries
  { type: 'Battery', name: 'RM 51.2V 100AH' },
  { type: 'Battery', name: 'SL-48100M' },
  { type: 'Battery', name: 'SL-48314M' },
  
  // VFD
  { type: 'VFD', name: 'SL-GD170-5R5-4-PV' },
  { type: 'VFD', name: 'SL-GD170-7R5-4-PV' },
  { type: 'VFD', name: 'SL-GD170-011-4-PV' },
  { type: 'VFD', name: 'SL-GD170-015-4-PV' },
  { type: 'VFD', name: 'SL-GD170-018-4-PV' },
  { type: 'VFD', name: 'SL-GD170-022-4-PV' },
  { type: 'VFD', name: 'SL-GD170-030-4-PV' },
  { type: 'VFD', name: 'SL-GD170-037-4-PV' },
  { type: 'VFD', name: 'SL-GD170-045-4-PV' },
  
];

// Parse model name into brand, productLine, variant
function parseModelName(modelName, type) {
  const name = modelName.trim();
  
  // Default brand
  let brand = 'Sunlife';
  let productLine = '';
  let variant = '';
  
  if (type === 'VFD') {
    // VFD format: "SL-GD170-5R5-4-PV" or "Sunlife VFD 2.2kW"
    if (name.startsWith('SL-GD170')) {
      // New VFD format: SL-GD170-XXX-4-PV
      brand = 'Sunlife';
      productLine = 'VFD';
      variant = name; // Use full name as variant
    } else {
      // Old VFD format: "Sunlife VFD 2.2kW"
      const parts = name.split(' ');
      if (parts.length >= 3) {
        brand = parts[0];
        productLine = 'VFD';
        variant = parts.slice(2).join(' ');
      } else {
        brand = 'Sunlife';
        productLine = 'VFD';
        variant = name;
      }
    }
  } else if (type === 'Battery') {
    // Battery format: "RM 51.2V 100AH", "SL-48100M", "SL-48314M", or "Lithium RM 51.2V 100AH"
    brand = 'Sunlife';
    if (name.startsWith('Lithium')) {
      productLine = name.replace('Lithium', '').trim();
    } else if (name.startsWith('SL-')) {
      // Format: SL-48100M, SL-48314M
      productLine = 'Lithium';
      variant = name;
    } else {
      // Format: RM 51.2V 100AH
      productLine = 'Lithium';
      variant = name;
    }
  } else {
    // Inverter format: "Sunpro 1.5kW", "SL 2.0kW", "SL Premium 3kW", etc.
    const parts = name.split(' ');
    
    // Special case: HI-6K-SL is the IP65 6kW model
    if (name === 'HI-6K-SL' || name === 'hi-6k-sl' || name === 'Hi-6K-SL') {
      brand = 'Sunlife';
      productLine = 'IP65';
      variant = '6kW';
    } else if (name.startsWith('Sunpro')) {
      brand = 'Sunpro';
      productLine = 'Sunpro';
      variant = parts.slice(1).join(' ');
    } else if (name.startsWith('SL')) {
      brand = 'Sunlife';
      // Handle different SL variants
      if (name.includes('ROYAL') || name.includes('Royal')) {
        productLine = 'SL Royal';
        variant = name.replace('SL Royal', '').replace('SL-ROYAL', '').trim();
      } else if (name.includes('ELITE') || name.includes('Elite')) {
        productLine = 'SL ELITE';
        variant = name.replace('SL ELITE', '').replace('SL-ELITE', '').trim();
      } else if (name.includes('IV SKY') || name.includes('IV-SKY')) {
        productLine = 'SL IV SKY';
        variant = name.replace('SL IV SKY', '').replace('SL-IV-SKY', '').trim();
      } else if (name.includes('IV') && !name.includes('SKY')) {
        productLine = 'SL IV';
        variant = name.replace('SL IV', '').replace('SL-IV', '').trim();
      } else if (name.includes('SKY ULTRA') || name.includes('SKY-ULTRA')) {
        productLine = 'SL-SKY ULTRA';
        variant = name.replace('SL-SKY ULTRA', '').replace('SL-SKY-ULTRA', '').trim();
      } else if (name.includes('ULTRA PLUS') || name.includes('ULTRA-PLUS')) {
        productLine = 'SL-ULTRA PLUS';
        variant = name.replace('SL-ULTRA PLUS', '').replace('SL-ULTRA-PLUS', '').trim();
      } else if (name.includes('INFINI ULTRA') || name.includes('INFINI-ULTRA')) {
        productLine = 'SL-INFINI ULTRA';
        variant = name.replace('SL-INFINI ULTRA', '').replace('SL-INFINI-ULTRA', '').trim();
      } else if (name.includes('SKY PLUS') || name.includes('SKY-PLUS')) {
        productLine = 'SKY PLUS';
        variant = name.replace('SKY PLUS', '').replace('SKY-PLUS', '').trim();
      } else if (name.includes('PLUS') || name.includes('Plus')) {
        productLine = 'SL PLUS';
        variant = name.replace('SL PLUS', '').replace('SL-PLUS', '').trim();
      } else if (name.includes('Premium')) {
        productLine = 'SL Premium';
        variant = name.replace('SL Premium', '').trim();
      } else if (name.match(/ip65/i)) {
        // Handle "6kW IP65" or "Sunlife 6kW Ip65" format
        brand = 'Sunlife';
        productLine = 'IP65';
        // Extract the kW value
        const kwMatch = name.match(/(\d+\.?\d*)\s*kw/i);
        if (kwMatch) {
          variant = `${kwMatch[1]}kW`;
        } else {
          // Remove IP65 and brand, keep the rest as variant
          variant = name.replace(/ip65/gi, '').replace(/sunlife/gi, '').trim();
        }
      } else {
        // Simple SL format
        productLine = 'SL';
        variant = parts.slice(1).join(' ');
      }
    } else {
      // Default parsing
      productLine = parts[0];
      variant = parts.slice(1).join(' ');
    }
  }
  
  // Generate model code
  // Special case: HI-6K-SL should keep its model code as-is
  let modelCode;
  if (name === 'HI-6K-SL' || name === 'hi-6k-sl' || name === 'Hi-6K-SL') {
    modelCode = 'HI-6K-SL';
  } else {
    // Convert decimal points to 'R' (e.g., 3.5kW -> 3R5, 2.2kW -> 2R2, 18.5kW -> 18R5)
    // Handle IP65 case-insensitively
    modelCode = name
      .toUpperCase()
      .replace(/\s+/g, '-')
      // Replace decimal point with 'R' (e.g., 3.5 -> 3R5, 2.2 -> 2R2)
      .replace(/(\d+)\.(\d+)/g, '$1R$2')
      // Normalize IP65 variations (IP65, Ip65, ip65 -> IP65)
      .replace(/IP65|IP-65/gi, 'IP65')
      // Remove other special characters but keep R, numbers, letters, and hyphens
      .replace(/[^A-Z0-9-R]/g, '');
    
    // Special handling for IP65 models - ensure consistent format: 6KW-IP65 (without brand)
    if (modelCode.includes('IP65')) {
      // Extract kW value and format as: {kW}KW-IP65 (remove brand prefix)
      const kwMatch = name.match(/(\d+\.?\d*)\s*KW/i) || modelCode.match(/(\d+\.?\d*R?\d*)\s*KW/i);
      if (kwMatch) {
        const kwValue = kwMatch[1].replace(/\./g, 'R').toUpperCase();
        modelCode = `${kwValue}KW-IP65`;
      } else if (modelCode.includes('6KW') || modelCode.includes('6-KW')) {
        modelCode = '6KW-IP65';
      } else {
        // Remove brand and format as: {value}KW-IP65
        modelCode = modelCode.replace(/SUNLIFE-/gi, '').replace(/SL-/gi, '');
        if (!modelCode.endsWith('IP65')) {
          modelCode = modelCode.replace(/IP65.*/gi, '').replace(/[^A-Z0-9-R]/g, '') + '-IP65';
        }
      }
    }
    
    // Fallback if modelCode is empty
    if (!modelCode) {
      modelCode = name.toUpperCase().replace(/\s+/g, '-').replace(/(\d+)\.(\d+)/g, '$1R$2');
    }
  }
  
  return {
    brand: brand.trim(),
    productLine: productLine.trim(),
    variant: variant.trim(),
    modelCode: modelCode,
    modelName: name.trim(),
  };
}

const seedModels = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;

    for (const model of models) {
      const { brand, productLine, variant, modelCode, modelName } = parseModelName(model.name, model.type);
      
      // Check if model already exists
      const existing = await InverterModel.findOne({ modelCode });
      
      if (existing) {
        console.log(`⏭️  Skipped: ${modelName} (already exists)`);
        skipped++;
        continue;
      }

      // Generate image path based on model code
      // Convert modelCode to lowercase and use as filename
      // Default to .jpg, but system will try .png or .jpeg if .jpg doesn't exist
      // Example: SL-SKY-4KW -> /products/sl-sky-4kw.jpg
      // Special cases for specific file extensions
      let imagePath = `/products/${modelCode.toLowerCase()}.jpg`;
      
      // Special mapping for models with different file extensions
      if (modelCode === 'HI-6K-SL') {
        imagePath = `/products/hi-6k-sl.jpg`;
      } else if (modelCode === 'SL-2R0KW' || modelCode === 'SL-2-0KW') {
        // SL 2.0kW uses .jpeg extension
        imagePath = `/products/sl-2r0kw.jpeg`;
      }

      // Create model
      await InverterModel.create({
        brand,
        productLine,
        variant,
        modelCode,
        modelName,
        image: imagePath,
        warranty: {
          partsMonths: 12,
          serviceMonths: 24,
        },
        active: true,
      });

      console.log(`✅ Created: ${modelName} (${modelCode})`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${models.length}`);
    console.log('\n✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding models:', error);
    process.exit(1);
  }
};

seedModels();
