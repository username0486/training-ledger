// Exercise database management
const EXERCISES_DB_KEY = 'workout_logs_exercises_db';

// Default exercises to populate the database
const DEFAULT_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Dips',
  'Lunges',
  'Leg Press',
  'Romanian Deadlift',
  'Incline Bench Press',
  'Lat Pulldown',
  'Leg Curl',
  'Leg Extension',
  'Calf Raises',
  'Bicep Curl',
  'Tricep Extension',
  'Lateral Raise',
  'Face Pull',
  'Plank',
];

export function loadExercisesDB(): string[] {
  try {
    const data = localStorage.getItem(EXERCISES_DB_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Initialize with defaults if empty
    saveExercisesDB(DEFAULT_EXERCISES);
    return DEFAULT_EXERCISES;
  } catch (error) {
    console.error('Failed to load exercises DB:', error);
    return DEFAULT_EXERCISES;
  }
}

export function saveExercisesDB(exercises: string[]): void {
  try {
    localStorage.setItem(EXERCISES_DB_KEY, JSON.stringify(exercises));
  } catch (error) {
    console.error('Failed to save exercises DB:', error);
  }
}

export function addExerciseToDb(exerciseName: string): void {
  const exercises = loadExercisesDB();
  if (!exercises.includes(exerciseName)) {
    exercises.push(exerciseName);
    saveExercisesDB(exercises);
  }
}

export function searchExercises(query: string, exercises: string[]): string[] {
  if (!query.trim()) {
    return exercises;
  }
  
  const lowerQuery = query.toLowerCase();
  return exercises.filter(ex => 
    ex.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => {
    // Prioritize exercises that start with the query
    const aStarts = a.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.toLowerCase().startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.localeCompare(b);
  });
}
