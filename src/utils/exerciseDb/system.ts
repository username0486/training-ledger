// System exercise loading from static JSON file

import { SystemExercise, normalizeExerciseName } from './types';
import { ANCHOR_EXERCISES } from '../exerciseAnchors';

// Use BASE_URL to ensure correct path resolution in dev and prod
// BASE_URL in Vite is typically '/' and already includes trailing slash if needed
const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''); // Remove trailing slash
const SYSTEM_EXERCISES_URL = `${BASE_URL}/exercises/systemExercises.json`;

// Fallback list of common exercises (minimum 20)
const FALLBACK_SYSTEM_EXERCISES: SystemExercise[] = [
  { id: 'sys:bench-press', name: 'Bench Press', bodyPart: 'chest', target: 'chest', equipment: ['barbell'], primaryMuscles: ['chest'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:squat', name: 'Squat', bodyPart: 'legs', target: 'legs', equipment: ['barbell'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:deadlift', name: 'Deadlift', bodyPart: 'back', target: 'back', equipment: ['barbell'], primaryMuscles: ['back'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:overhead-press', name: 'Overhead Press', bodyPart: 'shoulders', target: 'shoulders', equipment: ['barbell'], primaryMuscles: ['shoulders'], secondaryMuscles: [], source: 'system', isAnchor: true },
  { id: 'sys:barbell-row', name: 'Barbell Row', bodyPart: 'back', target: 'back', equipment: ['barbell'], primaryMuscles: ['back'], secondaryMuscles: [], source: 'system', isAnchor: true },
  { id: 'sys:pull-up', name: 'Pull-up', bodyPart: 'back', target: 'back', equipment: ['body weight'], primaryMuscles: ['back'], secondaryMuscles: [], source: 'system', isAnchor: true },
  { id: 'sys:push-up', name: 'Push-up', bodyPart: 'chest', target: 'chest', equipment: ['body weight'], primaryMuscles: ['chest'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:dip', name: 'Dip', bodyPart: 'triceps', target: 'triceps', equipment: ['body weight'], primaryMuscles: ['triceps'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:chin-up', name: 'Chin-up', bodyPart: 'biceps', target: 'biceps', equipment: ['body weight'], primaryMuscles: ['biceps'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:leg-press', name: 'Leg Press', bodyPart: 'legs', target: 'legs', equipment: ['machine'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:leg-curl', name: 'Leg Curl', bodyPart: 'legs', target: 'legs', equipment: ['machine'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:leg-extension', name: 'Leg Extension', bodyPart: 'legs', target: 'legs', equipment: ['machine'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:lateral-raise', name: 'Lateral Raise', bodyPart: 'shoulders', target: 'shoulders', equipment: ['dumbbell'], primaryMuscles: ['shoulders'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:bicep-curl', name: 'Bicep Curl', bodyPart: 'biceps', target: 'biceps', equipment: ['dumbbell'], primaryMuscles: ['biceps'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:tricep-extension', name: 'Tricep Extension', bodyPart: 'triceps', target: 'triceps', equipment: ['dumbbell'], primaryMuscles: ['triceps'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:shoulder-press', name: 'Shoulder Press', bodyPart: 'shoulders', target: 'shoulders', equipment: ['dumbbell'], primaryMuscles: ['shoulders'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:chest-fly', name: 'Chest Fly', bodyPart: 'chest', target: 'chest', equipment: ['dumbbell'], primaryMuscles: ['chest'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:lunges', name: 'Lunges', bodyPart: 'legs', target: 'legs', equipment: ['body weight'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:plank', name: 'Plank', bodyPart: 'core', target: 'core', equipment: ['body weight'], primaryMuscles: ['core'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:crunches', name: 'Crunches', bodyPart: 'core', target: 'core', equipment: ['body weight'], primaryMuscles: ['core'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:russian-twist', name: 'Russian Twist', bodyPart: 'core', target: 'core', equipment: ['body weight'], primaryMuscles: ['core'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:romanian-deadlift', name: 'Romanian Deadlift', bodyPart: 'legs', target: 'legs', equipment: ['barbell'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:front-squat', name: 'Front Squat', bodyPart: 'legs', target: 'legs', equipment: ['barbell'], primaryMuscles: ['legs'], secondaryMuscles: [], source: 'system' },
  { id: 'sys:incline-bench-press', name: 'Incline Bench Press', bodyPart: 'chest', target: 'chest', equipment: ['barbell'], primaryMuscles: ['chest'], secondaryMuscles: [], source: 'system' },
];

/**
 * Parse exercise data from various formats into SystemExercise
 */
function parseExerciseData(data: any): SystemExercise | null {
  // Schema A: string
  if (typeof data === 'string') {
    const name = data.trim();
    if (!name) return null;
    const normalizedName = normalizeExerciseName(name);
    let isAnchor = false;
    
    // Check if this exercise is a canonical anchor
    for (const [key, anchorNames] of Object.entries(ANCHOR_EXERCISES)) {
      if (anchorNames.some(anchor => normalizeExerciseName(anchor) === normalizedName)) {
        isAnchor = true;
        break;
      }
    }
    
    return {
      id: `sys:${normalizedName}`,
      name,
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      source: 'system',
      force: undefined,
      mechanic: undefined,
      level: undefined,
      isAnchor,
    };
  }

  // Schema B & C: object with name
  if (data && typeof data === 'object' && data.name && typeof data.name === 'string') {
    const name = data.name.trim();
    if (!name) return null;

    const normalizedName = normalizeExerciseName(name);
    const exercise: SystemExercise = {
      id: data.id && typeof data.id === 'string' ? data.id : `sys:${normalizedName}`,
      name,
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      source: 'system',
      force: undefined,
      mechanic: undefined,
      level: undefined,
      isAnchor: false, // Will be set below if matches anchor
    };
    
    // Check if this exercise is a canonical anchor
    for (const [key, anchorNames] of Object.entries(ANCHOR_EXERCISES)) {
      if (anchorNames.some(anchor => normalizeExerciseName(anchor) === normalizedName)) {
        exercise.isAnchor = true;
        break;
      }
    }

    // Map various field names to our structure
    if (data.bodyPart) exercise.bodyPart = typeof data.bodyPart === 'string' ? data.bodyPart : String(data.bodyPart);
    if (data.target) {
      const targetValue = typeof data.target === 'string' ? data.target : String(data.target);
      exercise.target = targetValue;
      // Also set as primaryMuscles for backward compatibility
      exercise.primaryMuscles = [targetValue];
    }
    if (data.primaryMuscles) {
      exercise.primaryMuscles = Array.isArray(data.primaryMuscles)
        ? data.primaryMuscles.map(String)
        : [String(data.primaryMuscles)];
    }
    if (data.equipment) {
      exercise.equipment = Array.isArray(data.equipment) 
        ? data.equipment.map(String)
        : [String(data.equipment)];
    }
    if (data.secondaryMuscles) {
      exercise.secondaryMuscles = Array.isArray(data.secondaryMuscles)
        ? data.secondaryMuscles.map(String)
        : [String(data.secondaryMuscles)];
    }
    if (data.category) {
      exercise.category = typeof data.category === 'string' ? data.category : String(data.category);
    }
    if (data.aliases) {
      exercise.aliases = Array.isArray(data.aliases)
        ? data.aliases.map(String).filter(Boolean)
        : [];
    }
    if (data.instructions) {
      exercise.instructions = Array.isArray(data.instructions)
        ? data.instructions.map(String).filter(Boolean)
        : [];
    }
    
    // Map force, mechanic, level fields
    if (data.force) {
      exercise.force = typeof data.force === 'string' ? data.force : String(data.force);
    }
    if (data.mechanic) {
      exercise.mechanic = typeof data.mechanic === 'string' ? data.mechanic : String(data.mechanic);
    }
    if (data.level) {
      exercise.level = typeof data.level === 'string' ? data.level : String(data.level);
    }

    return exercise;
  }

  return null;
}

/**
 * Load system exercises from static JSON file
 * Returns fallback list if file is missing or empty
 */
export async function loadSystemExercises(): Promise<SystemExercise[]> {
  const url = SYSTEM_EXERCISES_URL;
  
  try {
    const response = await fetch(url, { cache: 'no-store' });
    
    // Check for HTML response (file missing/404) - check BEFORE checking response.ok
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const responseText = await response.text();
      const preview = responseText.substring(0, 200);
      console.error(
        `[ExerciseDB] systemExercises.json is missing or service worker returned HTML.\n` +
        `  URL: ${url}\n` +
        `  Status: ${response.status} ${response.statusText}\n` +
        `  Content-Type: ${contentType}\n` +
        `  Response preview: ${preview}\n` +
        `  Using fallback list of ${FALLBACK_SYSTEM_EXERCISES.length} exercises.`
      );
      return FALLBACK_SYSTEM_EXERCISES;
    }

    if (!response.ok) {
      const responseText = await response.text();
      const preview = responseText.substring(0, 200);
      console.error(
        `[ExerciseDB] Failed to load systemExercises.json.\n` +
        `  URL: ${url}\n` +
        `  Status: ${response.status} ${response.statusText}\n` +
        `  Content-Type: ${contentType}\n` +
        `  Response preview: ${preview}\n` +
        `  Using fallback list of ${FALLBACK_SYSTEM_EXERCISES.length} exercises.`
      );
      return FALLBACK_SYSTEM_EXERCISES;
    }

    if (!contentType.includes('application/json')) {
      const responseText = await response.text();
      const preview = responseText.substring(0, 200);
      console.error(
        `[ExerciseDB] systemExercises.json is not valid JSON.\n` +
        `  URL: ${url}\n` +
        `  Status: ${response.status} ${response.statusText}\n` +
        `  Content-Type: ${contentType}\n` +
        `  Response preview: ${preview}\n` +
        `  Using fallback list of ${FALLBACK_SYSTEM_EXERCISES.length} exercises.`
      );
      return FALLBACK_SYSTEM_EXERCISES;
    }

    const data = await response.json();

    // Handle different JSON structures
    let exercisesArray: any[] = [];
    if (Array.isArray(data)) {
      exercisesArray = data;
    } else if (data.exercises && Array.isArray(data.exercises)) {
      exercisesArray = data.exercises;
    } else if (data.results && Array.isArray(data.results)) {
      exercisesArray = data.results;
    }

    // Parse exercises
    const parsed: SystemExercise[] = [];
    for (const item of exercisesArray) {
      const exercise = parseExerciseData(item);
      if (exercise) {
        parsed.push(exercise);
      }
    }

    // If parsed list is empty, use fallback
    if (parsed.length === 0) {
      console.error(
        `[ExerciseDB] systemExercises.json is empty or contains no valid exercises.\n` +
        `  URL: ${url}\n` +
        `  Parsed array length: ${exercisesArray.length}\n` +
        `  Using fallback list of ${FALLBACK_SYSTEM_EXERCISES.length} exercises.`
      );
      return FALLBACK_SYSTEM_EXERCISES;
    }

    if (import.meta.env.DEV) {
      console.log(`[ExerciseDB] System exercises loaded from JSON file: ${parsed.length}`);
    }
    return parsed;
  } catch (error) {
    console.error(
      `[ExerciseDB] Error loading systemExercises.json:\n` +
      `  URL: ${url}\n` +
      `  Error: ${error instanceof Error ? error.message : String(error)}\n` +
      `  Using fallback list of ${FALLBACK_SYSTEM_EXERCISES.length} exercises.`
    );
    return FALLBACK_SYSTEM_EXERCISES;
  }
}
