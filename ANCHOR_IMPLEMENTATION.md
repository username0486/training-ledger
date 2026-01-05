# Exercise Anchor Implementation

## Overview
Implements an anchor/canonical mechanism to ensure generic searches (e.g., "deadlift") resolve to obvious defaults rather than obscure variants.

## Implementation

### 1. Anchor Registry (`src/utils/exerciseAnchors.ts`)
- Defines canonical anchor exercises for key lifts:
  - `deadlift` → ["Deadlift", "Barbell Deadlift"]
  - `squat` → ["Squat", "Barbell Squat", "Back Squat"]
  - `bench press` → ["Bench Press", "Barbell Bench Press"]
  - `overhead press` → ["Overhead Press", "Barbell Overhead Press", "OHP"]
  - `row` → ["Barbell Row", "Bent-Over Row"]
  - `pulldown` → ["Lat Pulldown", "Lat Pull-down"]
  - `pull-up` → ["Pull-up", "Pull Up", "Chin-up"]

### 2. Anchor Flag (`SystemExercise.isAnchor`)
- Added `isAnchor?: boolean` to `SystemExercise` type
- System exercises matching anchor names are automatically marked as anchors during parsing
- Fallback exercises include anchor flags

### 3. Specialty Modifier Penalty
- Detects specialty modifiers: band, chain, axle, car, reverse band, rickshaw, leverage, trap bar, etc.
- Applies -50 score penalty to exercises with specialty modifiers unless query includes those modifiers
- Example: "Deadlift with Bands" ranks lower for query "deadlift" but higher for "band deadlift"

### 4. Search Ranking Updates (`src/utils/exerciseDb/intentSearch.ts`)
Ranking order (highest to lowest):
1. **Previously-used exercises**: Usage stats + affinity (10x + 5x multiplier)
2. **Anchor exercises**: +100 boost for exact anchor match, +50 for anchor variant
3. **Familiarity score**: Existing familiarity-first ranking
4. **Specialty penalty**: -50 for specialty variants (unless query includes modifier)
5. **Alphabetical**: Final tie-breaker

### 5. Anchor Alias Initialization
- `initializeAnchorAliases()` automatically adds generic aliases to anchor exercises
- Example: "Barbell Deadlift" gets alias "deadlift"
- Called during `initializeExerciseDb()`

### 6. Seeding Updates (`src/utils/devSeed.ts`)
- `findOrCreateExercise()` now prefers anchor exercises for canonical names
- Templates use anchor names (e.g., "Deadlift" not "Deadlift clean and pure")

## Test Cases

### ✅ Test 1: search("deadlift") returns anchor as #1
- Query: "deadlift"
- Expected: Anchor exercise (Deadlift or Barbell Deadlift) appears first
- Implementation: Anchor boost (+100) + anchor ranking priority

### ✅ Test 2: search("band deadlift") returns "Deadlift with Bands" above anchor
- Query: "band deadlift"
- Expected: Band variant appears above plain anchor
- Implementation: Query includes "band" modifier, so no penalty applied

### ✅ Test 3: Previously-used user exercise ranks above system variants
- Scenario: User has used "My Deadlift" in workouts
- Query: "deadlift"
- Expected: "My Deadlift" ranks above system variants (but anchor still #1 if no usage)
- Implementation: Usage stats (10x) + affinity (5x) multiplier

## Files Modified

1. **`src/utils/exerciseAnchors.ts`** (NEW)
   - Anchor registry
   - Specialty modifier detection
   - Anchor finding/checking functions

2. **`src/utils/exerciseDb/types.ts`**
   - Added `isAnchor?: boolean` to `SystemExercise`

3. **`src/utils/exerciseDb/system.ts`**
   - Auto-marks exercises as anchors during parsing
   - Sets `isAnchor: true` for fallback exercises

4. **`src/utils/exerciseDb/intentSearch.ts`**
   - Anchor-aware ranking with usage/affinity priority
   - Specialty modifier penalty

5. **`src/utils/exerciseDb/index.ts`**
   - Calls `initializeAnchorAliases()` during initialization

6. **`src/utils/devSeed.ts`**
   - `findOrCreateExercise()` prefers anchors

7. **`src/utils/exerciseAnchors.test.ts`** (NEW)
   - Test utilities for manual verification

## Usage

The anchor mechanism works automatically:
- System exercises matching anchor names are marked as anchors
- Generic searches (e.g., "deadlift") prioritize anchors
- Specialty variants are penalized unless query includes modifier
- Previously-used exercises still rank highest (user history > anchors)

## Constraints Met

- ✅ No UI redesign
- ✅ No modals
- ✅ Offline only
- ✅ Incremental changes
- ✅ Minimal schema changes (one optional boolean field)

