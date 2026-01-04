#!/usr/bin/env node

/**
 * Script to download Free Exercise Database and copy to public/systemExercises.json
 * Run with: node scripts/create-system-exercises.js
 * 
 * This downloads the free-exercise-db dataset (774+ exercises) from GitHub
 * and places it in the public folder for the app to use.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'systemExercises.json');

console.log('Downloading Free Exercise Database...');
console.log(`From: ${REPO_URL}`);
console.log(`To: ${OUTPUT_PATH}`);

https.get(REPO_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }

  let data = '';
  response.on('data', (chunk) => {
    data += chunk;
  });

  response.on('end', () => {
    try {
      // Verify it's valid JSON
      const exercises = JSON.parse(data);
      
      // Write to file
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(exercises, null, 2));
      
      console.log('✅ Successfully downloaded exercise database!');
      console.log(`📁 Saved to: ${OUTPUT_PATH}`);
      console.log(`📊 Loaded ${exercises.length} exercises`);
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Error downloading file:', err.message);
  console.error('\nTip: If you see SSL/certificate errors, try running:');
  console.error('  curl -o public/systemExercises.json https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
  process.exit(1);
});
