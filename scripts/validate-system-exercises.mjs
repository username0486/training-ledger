#!/usr/bin/env node

/**
 * Validation script for systemExercises.json
 * Checks that the file exists, is valid JSON, and has sufficient exercises
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_EXERCISES_PATH = path.join(__dirname, '..', 'public', 'exercises', 'systemExercises.json');
const MIN_EXERCISE_COUNT = 200;

console.log(`Validating: ${SYSTEM_EXERCISES_PATH}\n`);

// Check if file exists
if (!fs.existsSync(SYSTEM_EXERCISES_PATH)) {
  console.error(`❌ Error: File does not exist`);
  console.error(`   Expected: ${SYSTEM_EXERCISES_PATH}`);
  process.exit(1);
}

// Read file
let fileContent;
try {
  fileContent = fs.readFileSync(SYSTEM_EXERCISES_PATH, 'utf8');
} catch (error) {
  console.error(`❌ Error reading file:`, error.message);
  process.exit(1);
}

// File size
const fileSizeBytes = Buffer.byteLength(fileContent, 'utf8');
console.log(`📊 File size: ${fileSizeBytes.toLocaleString()} bytes`);

// Parse JSON
let data;
try {
  data = JSON.parse(fileContent);
} catch (error) {
  console.error(`❌ Error parsing JSON:`, error.message);
  process.exit(1);
}

// Determine JSON type
const jsonType = Array.isArray(data) 
  ? 'array' 
  : typeof data === 'object' && data !== null
    ? 'object'
    : typeof data;

console.log(`📋 Parsed JSON type: ${jsonType}`);

// Extract exercises array
let exercisesArray = [];
if (Array.isArray(data)) {
  exercisesArray = data;
} else if (data.exercises && Array.isArray(data.exercises)) {
  exercisesArray = data.exercises;
} else if (data.results && Array.isArray(data.results)) {
  exercisesArray = data.results;
} else {
  console.error(`❌ Error: JSON structure not recognized`);
  console.error(`   Expected: array, {exercises: []}, or {results: []}`);
  console.error(`   Got: ${jsonType}`);
  process.exit(1);
}

const count = exercisesArray.length;
console.log(`🔢 Total exercises: ${count.toLocaleString()}`);

// Sample names
if (count > 0) {
  console.log(`\n📝 Sample exercises (first 3):`);
  for (let i = 0; i < Math.min(3, count); i++) {
    const ex = exercisesArray[i];
    if (typeof ex === 'string') {
      console.log(`   ${i + 1}. "${ex}"`);
    } else if (ex && typeof ex === 'object' && ex.name) {
      console.log(`   ${i + 1}. "${ex.name}"`);
    } else {
      console.log(`   ${i + 1}. ${JSON.stringify(ex).substring(0, 50)}...`);
    }
  }
}

// Validate count
if (count < MIN_EXERCISE_COUNT) {
  console.error(`\n❌ Validation failed: Exercise count (${count}) is below minimum (${MIN_EXERCISE_COUNT})`);
  console.error(`   The app will use fallback exercises instead.`);
  console.error(`\n   To fix:`);
  console.error(`   1. Download the Free Exercise Database from:`);
  console.error(`      https://github.com/yuhonas/free-exercise-db`);
  console.error(`   2. Place exercises.json in: public/exercises/systemExercises.json`);
  console.error(`   3. Run this validation script again`);
  process.exit(1);
}

console.log(`\n✅ Validation passed: ${count} exercises (minimum: ${MIN_EXERCISE_COUNT})`);
process.exit(0);



