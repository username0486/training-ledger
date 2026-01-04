#!/usr/bin/env node

/**
 * Script to download the Free Exercise Database from GitHub
 * Run with: node scripts/download-exercise-db.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'exercises.json');

console.log('Downloading Free Exercise Database...');
console.log(`From: ${REPO_URL}`);
console.log(`To: ${OUTPUT_PATH}`);

https.get(REPO_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(OUTPUT_PATH);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('✅ Successfully downloaded exercise database!');
    console.log(`📁 Saved to: ${OUTPUT_PATH}`);
    
    // Verify the file
    const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`📊 Loaded ${data.length} exercises`);
  });
}).on('error', (err) => {
  console.error('Error downloading file:', err.message);
  process.exit(1);
});


