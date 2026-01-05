# Training Ledger

A focused workout log that handles weights, reps, and sessions so you can concentrate on training.

## Exercise Database

The app uses an ExerciseDB-first, offline-first approach for exercise data. System exercises are loaded from a static JSON file.

### Dataset Location

The system exercise database must be located at:
```
public/exercises/systemExercises.json
```

### Supported JSON Formats

The system supports multiple JSON schema formats:

#### Format 1: Array of Strings
```json
[
  "Bench Press",
  "Squat",
  "Deadlift"
]
```

#### Format 2: Array of Objects with Name
```json
[
  { "name": "Bench Press" },
  { "name": "Squat" },
  { "name": "Deadlift" }
]
```

#### Format 3: Full ExerciseDB Objects
```json
[
  {
    "name": "Bench Press",
    "bodyPart": "chest",
    "target": "pectorals",
    "equipment": "barbell",
    "secondaryMuscles": ["shoulders", "triceps"]
  },
  {
    "name": "Squat",
    "bodyPart": "legs",
    "target": "quadriceps",
    "equipment": "barbell",
    "secondaryMuscles": ["glutes", "hamstrings"]
  }
]
```

#### Format 4: Wrapped Array
```json
{
  "exercises": [
    { "name": "Bench Press" },
    { "name": "Squat" }
  ]
}
```

Or:
```json
{
  "results": [
    { "name": "Bench Press" },
    { "name": "Squat" }
  ]
}
```

### Validation

To validate that the exercise database file is properly populated:

```bash
npm run validate:exercises
```

This script will:
- Check that the file exists
- Validate JSON structure
- Report the total exercise count
- Show sample exercise names
- Exit with an error if count < 200

**Expected output:**
- File size (bytes)
- Parsed JSON type
- Total exercise count (should be > 700 for full database)
- Sample exercise names

If the validation fails or shows a low count (< 200), the app will use a fallback list of 24 common exercises.

### Setting Up the Full Database

To use the full Free Exercise Database:

1. Download the dataset from: https://github.com/yuhonas/free-exercise-db
2. Place the `exercises.json` file at: `public/exercises/systemExercises.json`
3. Run validation: `npm run validate:exercises`
4. Verify the app logs show: `System exercises: > 700` (in development mode)

The app will automatically:
- Load exercises from the JSON file on startup
- Cache them in memory for fast access
- Fall back to 24 common exercises if the file is missing or empty
- Merge system exercises with user-added exercises
- Work fully offline after initial load
