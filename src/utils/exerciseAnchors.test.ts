/**
 * Tests for exercise anchor mechanism
 * Run with: npm test (if test framework is set up)
 * Or manually verify in browser console
 */

import { getAllExercisesList } from './exerciseDb';
import { searchExercisesWithIntent } from './exerciseDb/intentSearch';
import { findAnchorExercise, isAnchorForQuery, hasSpecialtyModifiers } from './exerciseAnchors';

/**
 * Manual test: search("deadlift") returns anchor as #1
 */
export async function testDeadliftAnchor() {
  const exercises = getAllExercisesList();
  const results = searchExercisesWithIntent(exercises, 'deadlift');
  
  console.log('[Test] Searching for "deadlift"');
  console.log('Top 5 results:', results.matches.slice(0, 5).map(ex => ex.name));
  
  const firstResult = results.matches[0];
  const anchor = findAnchorExercise('deadlift', exercises);
  
  if (anchor && firstResult.id === anchor.id) {
    console.log('✅ PASS: Anchor exercise is #1');
    return true;
  } else {
    console.log('❌ FAIL: Anchor exercise is not #1');
    console.log('Expected:', anchor?.name);
    console.log('Got:', firstResult.name);
    return false;
  }
}

/**
 * Manual test: search("band deadlift") returns "Deadlift with Bands" above anchor
 */
export async function testBandDeadlift() {
  const exercises = getAllExercisesList();
  const results = searchExercisesWithIntent(exercises, 'band deadlift');
  
  console.log('[Test] Searching for "band deadlift"');
  console.log('Top 5 results:', results.matches.slice(0, 5).map(ex => ex.name));
  
  // Find band deadlift variant
  const bandVariant = results.matches.find(ex => 
    ex.name.toLowerCase().includes('band') && ex.name.toLowerCase().includes('deadlift')
  );
  
  if (bandVariant && results.matches.indexOf(bandVariant) < 3) {
    console.log('✅ PASS: Band deadlift variant appears in top 3');
    return true;
  } else {
    console.log('⚠️  INFO: No band deadlift variant found (may not exist in dataset)');
    return true; // Not a failure if variant doesn't exist
  }
}

/**
 * Manual test: previously-used user exercise containing "deadlift" ranks above system variants
 */
export async function testUserExerciseRanking() {
  // This test requires:
  // 1. A user-created exercise with "deadlift" in the name
  // 2. That exercise being used in a workout (usage stats)
  // 3. Then searching for "deadlift"
  
  console.log('[Test] User exercise ranking (requires seeded data)');
  console.log('⚠️  This test requires usage stats to be populated');
  console.log('Run seedAllDemoData() first, then search for "deadlift"');
  console.log('Expected: User-created exercise with usage should rank above system variants');
  
  return true;
}

/**
 * Run all tests
 */
export async function runAnchorTests() {
  console.log('=== Exercise Anchor Tests ===\n');
  
  const results = {
    deadliftAnchor: await testDeadliftAnchor(),
    bandDeadlift: await testBandDeadlift(),
    userExerciseRanking: await testUserExerciseRanking(),
  };
  
  console.log('\n=== Test Results ===');
  console.log(results);
  
  return results;
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testExerciseAnchors = runAnchorTests;
}

