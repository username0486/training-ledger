// Re-export from new exercise DB module
// This file provides backward compatibility for existing imports

export {
  initializeExerciseDb,
  initializeExerciseDatabase, // backward compat
  getAllExercises,
  getAllExercisesList, // backward compat
  searchExercises,
  addExerciseToDb,
  loadExercisesDB, // backward compat
  filterExercises, // backward compat
  type SystemExercise,
  type UserExercise,
  type AnyExercise,
  type ExerciseDBEntry,
} from '../../utils/exerciseDb/index';
