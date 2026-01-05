# Development Seed Data

## Overview
This module provides deterministic mock data generation for development and testing. It populates the app with realistic workouts, templates, exercise history, and usage stats.

## Features
- **8 workout templates**: Upper A/B, Lower A/B, Push/Pull/Legs, Full Body
- **6 weeks of workout history**: 3-5 sessions per week with realistic spacing
- **Realistic sets/weights/reps**: Includes variance, progressive overload, occasional missed reps
- **Usage stats**: Populated based on generated history
- **Query affinities**: Pre-seeded mappings (e.g., "chest press" → "Bench Press")
- **User-created exercises**: Includes messy names to test duplicates/aliases

## Usage

### In Development Mode
The seed buttons appear automatically in the Home screen (dev mode only).

1. **Seed Data**: Adds demo data without deleting existing data (idempotent)
2. **Reset & Seed**: Wipes all data and reseeds fresh (use for clean slate)

### Programmatic Usage
```typescript
import { seedAllDemoData, resetAndSeed } from './utils/devSeed';

// Add demo data (idempotent)
seedAllDemoData();

// Wipe and reseed
resetAndSeed();
```

## Safety
- **Production-safe**: All functions check `import.meta.env.PROD` and exit early
- **Idempotent**: `seedAllDemoData()` won't create duplicates
- **Deterministic**: Uses fixed seed (1337) for reproducible data

## Generated Data

### Workout Templates (8)
- Upper A (Bench focus)
- Lower A (Squat focus)
- Upper B (Overhead/Row focus)
- Lower B (Hinge focus)
- Push
- Pull
- Legs
- Full Body

### Workout History
- **Duration**: 6 weeks
- **Frequency**: 3-5 sessions per week
- **Spacing**: 1-3 days between sessions
- **Deloads**: ~15% of sessions are lighter
- **Time of day**: Varied (morning/afternoon/evening)

### Exercises
- Common lifts: Bench Press, Squat, Deadlift, OHP, Rows, Pull-ups, etc.
- User-created: "Chest press machine", "Lat pull", "Ham curl", etc.

### Query Affinities
- "chest press" → Bench Press
- "back machine" → Lat Pulldown
- "leg press" → Leg Press
- "shoulder press" → Overhead Press
- "lat pull" → Lat Pulldown
- "row" → Barbell Row

## Implementation Details

### Deterministic Generation
Uses a seeded RNG (seed: 1337) for reproducible data. Same seed = same data.

### Realistic Weights/Reps
- Compound movements: 60-100kg, 5-8 reps
- Isolation movements: 10-20kg, 10-15 reps
- Machine exercises: 70-150kg, 8-12 reps
- Includes variance (±2.5kg weight, ±1 rep)
- Progressive overload: +2.5kg per set for compounds
- Occasional missed reps: 5% chance

### Usage Stats
- `useCount`: Increments per workout appearance
- `lastUsedAt`: Latest session timestamp
- `lastUsedInWorkoutTemplateId`: Template name

## Files Modified
- `src/utils/devSeed.ts`: Main seeding logic
- `src/app/screens/HomeScreen.tsx`: Dev buttons (dev mode only)

## Notes
- Refresh the page after seeding to see changes
- Data is stored in localStorage (same as production)
- All existing storage keys are respected

