/**
 * Script to rename product images to match model code format
 * Converts filenames to: {modelcode-lowercase}.{extension}
 * 
 * Run: node renameProductImages.js
 * 
 * Note: This script maps existing filenames to model codes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of existing filenames to model codes (lowercase, hyphens, decimals as R)
const imageMapping = {
  // Inverters
  '01. Infini ULTRA 6KW.jpg': 'sl-infini-ultra-6kw',
  '02. SL SKY ULTRA 8kW.jpg': 'sl-sky-ultra-8kw',
  '03. SL SKY ULTRA 11kW.jpg': 'sl-sky-ultra-11kw',
  '04. SL ULTRA PLUS 8kW.jpg': 'sl-ultra-plus-8kw',
  '05. SL ULTRA PLUS 11kW.jpg': 'sl-ultra-plus-11kw',
  '06. SL-ELITE 6KW.jpg': 'sl-elite-6kw',
  '07. SL-PREMIUM 3KW.jpg': 'sl-premium-3kw',
  '08. SL-ROYAL 4KW.jpg': 'sl-royal-4kw',
  '09. SL-ROYAL 6KW.jpg': 'sl-royal-6kw',
  'SKY PLUS 6KW.png': 'sky-plus-6kw',
  'sky-plus-4kw.png': 'sky-plus-4kw', // Already correct
  'SL IV 4.2kW.png': 'sl-iv-4r2kw',
  'SL IV 6.2kW.png': 'sl-iv-6r2kw',
  'SL PLUS 4KW.jpg': 'sl-plus-4kw',
  'SL PLUS 6KW.jpg': 'sl-plus-6kw',
  'SL PRO 3.5KW.png': 'sunpro-3r5kw',
  'SL-AXPERT VMIII 4KW.png': 'sl-axpert-vmiii-4kw',
  'SUNPRO SL 1.5KW.png': 'sunpro-1r5kw',
  'SUNPRO SL 3.0KW.png': 'sunpro-3kw',
  'hi-6k-sl.jpg': '6kw-ip65', // Sunlife 6kW Ip65 - maps hi-6k-sl.jpg to 6kw-ip65.jpg
  
  // Note: Some files may need manual mapping if they don't match model codes exactly
};

const renameImages = async () => {
  try {
    const productsDir = path.join(__dirname, '../frontend/public/products');
    
    if (!fs.existsSync(productsDir)) {
      console.error('❌ Products directory not found:', productsDir);
      process.exit(1);
    }

    const files = fs.readdirSync(productsDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png)$/i.test(file) && file !== 'logo.png' && file !== 'Logo1.png'
    );

    console.log(`Found ${imageFiles.length} image files\n`);

    let renamed = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of imageFiles) {
      const oldPath = path.join(productsDir, file);
      const extension = path.extname(file).toLowerCase(); // Preserve original extension (.jpg or .png)
      
      // Get the new filename from mapping
      const newBaseName = imageMapping[file];
      
      if (!newBaseName) {
        console.log(`⏭️  Skipped: ${file} (no mapping found - add to imageMapping)`);
        skipped++;
        continue;
      }

      // Preserve the original extension (.jpg or .png)
      const newFileName = `${newBaseName}${extension}`;
      const newPath = path.join(productsDir, newFileName);

      // Skip if already renamed
      if (file === newFileName) {
        console.log(`✓ Already correct: ${file}`);
        continue;
      }

      // Check if target file already exists
      if (fs.existsSync(newPath) && oldPath !== newPath) {
        console.log(`⚠️  Warning: ${newFileName} already exists. Skipping ${file}`);
        skipped++;
        continue;
      }

      try {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renamed: ${file} → ${newFileName}`);
        renamed++;
      } catch (error) {
        console.error(`❌ Error renaming ${file}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Renamed: ${renamed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${imageFiles.length}`);
    console.log('\n✅ Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error renaming images:', error);
    process.exit(1);
  }
};

renameImages();
