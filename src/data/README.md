# Exercise Database

This directory contains the Free Exercise Database from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db).

## Setup

To populate the exercise database, download the exercises.json file:

### Option 1: Using the provided script

```bash
node scripts/download-exercise-db.js
```

### Option 2: Manual download

1. Visit: https://github.com/yuhonas/free-exercise-db
2. Download `dist/exercises.json`
3. Place it in this directory (`src/data/exercises.json`)

### Option 3: Using curl

```bash
curl -o src/data/exercises.json https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
```

## Data Format

The exercises.json file should contain an array of exercise objects with the following structure:

```json
[
  {
    "name": "Bench Press",
    "primaryMuscles": ["chest"],
    "secondaryMuscles": ["shoulders", "triceps"],
    "equipment": ["barbell"],
    "category": "strength"
  },
  ...
]
```

## License

The Free Exercise Database is released under the Unlicense (public domain).


