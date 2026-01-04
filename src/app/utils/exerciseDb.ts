// Exercise database management
// Primary: Static JSON file (public/systemExercises.json)
// Fallback: wger.de ExerciseDB API
// Offline: Cached in localStorage
// Merges with user-created exercises stored in localStorage

const EXERCISES_DB_KEY = 'workout_logs_exercises_db';
const USER_EXERCISES_KEY = 'workout_logs_user_exercises';
const SYSTEM_EXERCISES_CACHE_KEY = 'workout_logs_system_exercises_cache';
const SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY = 'workout_logs_system_exercises_cache_timestamp';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Internal exercise database entry structure
export interface ExerciseDBEntry {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  category?: string;
  source: 'system' | 'user';
}

// wger.de API response structure
interface WgerExerciseResponse {
  id: number;
  name?: string;
  name_en?: string;
  description?: string;
  category?: number;
  category_name?: string;
  muscles?: number[];
  muscles_secondary?: number[];
  equipment?: number[];
  equipment_names?: string[];
  muscles_names?: string[];
  muscles_secondary_names?: string[];
  [key: string]: any; // Allow additional fields
}

interface WgerApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WgerExerciseResponse[];
}

// Generate a stable ID from exercise name (slugified)
function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normalize a wger.de exercise entry into our internal format
function normalizeWgerExercise(wger: WgerExerciseResponse, source: 'system' | 'user' = 'system'): ExerciseDBEntry | null {
  // Skip exercises without a name - check both name and name_en fields
  const exerciseName = wger.name || wger.name_en || '';
  if (!exerciseName || typeof exerciseName !== 'string' || exerciseName.trim() === '') {
    return null;
  }
  
  // Handle ID - use id if available, otherwise generate one
  const exerciseId = (wger.id !== undefined && wger.id !== null) ? wger.id.toString() : generateId(exerciseName);
  
  return {
    id: exerciseId,
    name: exerciseName.trim(),
    primaryMuscles: Array.isArray(wger.muscles_names) ? wger.muscles_names : [],
    secondaryMuscles: Array.isArray(wger.muscles_secondary_names) ? wger.muscles_secondary_names : [],
    equipment: Array.isArray(wger.equipment_names) ? wger.equipment_names : [],
    category: wger.category_name || undefined,
    source,
  };
}

// Normalize a user exercise entry into our internal format
function normalizeUserExercise(
  raw: { name: string; primaryMuscles?: string[]; secondaryMuscles?: string[]; equipment?: string[]; category?: string },
  source: 'system' | 'user' = 'user'
): ExerciseDBEntry {
  return {
    id: generateId(raw.name),
    name: raw.name,
    primaryMuscles: raw.primaryMuscles || [],
    secondaryMuscles: raw.secondaryMuscles || [],
    equipment: raw.equipment || [],
    category: raw.category,
    source,
  };
}

// Load system exercises from static JSON file (primary source)
async function loadSystemExercisesFromJSON(): Promise<ExerciseDBEntry[]> {
  const jsonUrl = '/systemExercises.json';
  
  try {
    console.log(`[ExerciseDB] Attempting to load system exercises from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl, { cache: 'no-store' });
    
    // Defensive diagnostics - log response details
    console.log(`[ExerciseDB] Response status: ${response.status} ${response.statusText}`);
    const contentType = response.headers.get('content-type') || '';
    console.log(`[ExerciseDB] Response content-type: ${contentType}`);
    
    // Guardrail: Check content-type before parsing
    // If it's HTML, the file is missing or service worker is intercepting
    if (contentType.includes('text/html')) {
      const responseText = await response.text();
      const preview = responseText.substring(0, 120);
      const errorMsg = `[ExerciseDB] systemExercises.json file is missing or service worker is returning HTML. Response preview: ${preview}`;
      console.error(errorMsg);
      throw new Error('systemExercises.json file is missing or service worker is intercepting the request. Please ensure /public/systemExercises.json exists in the repository.');
    }
    
    if (!response.ok) {
      // Read response text to see what we got
      const responseText = await response.text();
      const preview = responseText.substring(0, 120);
      console.error(`[ExerciseDB] Failed to load JSON file. Status: ${response.status}. Response preview: ${preview}`);
      throw new Error(`Failed to load JSON file: ${response.status} ${response.statusText}`);
    }
    
    if (!contentType.includes('application/json')) {
      const responseText = await response.text();
      const preview = responseText.substring(0, 120);
      console.error(`[ExerciseDB] Response is not JSON. Content-type: ${contentType}. Response preview: ${preview}`);
      throw new Error(`Response is not JSON (content-type: ${contentType})`);
    }
    
    // Parse JSON
    const data = await response.json();
    
    // Handle different JSON formats
    let exercises: any[] = [];
    if (Array.isArray(data)) {
      exercises = data;
    } else if (data.exercises && Array.isArray(data.exercises)) {
      exercises = data.exercises;
    } else if (data.results && Array.isArray(data.results)) {
      exercises = data.results;
    }
    
    // Normalize exercises to our format - handle multiple schemas
    const normalized: ExerciseDBEntry[] = [];
    for (const ex of exercises) {
      // Schema a) array of strings: ["Bench Press", "Squat"]
      if (typeof ex === 'string') {
        normalized.push(normalizeUserExercise({ name: ex }, 'system'));
      }
      // Schema b) array of { name: string }: [{ "name": "Bench Press" }]
      else if (ex.name && typeof ex.name === 'string') {
        // Handle different field names from various exercise DB formats
        const exercise: ExerciseDBEntry = {
          id: ex.id || generateId(ex.name),
          name: ex.name.trim(),
          primaryMuscles: Array.isArray(ex.primaryMuscles) 
            ? ex.primaryMuscles 
            : (Array.isArray(ex.muscles) 
              ? ex.muscles 
              : (Array.isArray(ex.target) 
                ? [ex.target].filter(Boolean) 
                : (ex.bodyPart ? [ex.bodyPart] : []))),
          secondaryMuscles: Array.isArray(ex.secondaryMuscles) 
            ? ex.secondaryMuscles 
            : (Array.isArray(ex.muscles_secondary) ? ex.muscles_secondary : []),
          equipment: Array.isArray(ex.equipment) 
            ? ex.equipment 
            : (ex.equipment && typeof ex.equipment === 'string' ? [ex.equipment] : []),
          category: ex.category || ex.category_name || ex.bodyPart || undefined,
          source: 'system',
        };
        normalized.push(exercise);
      }
    }
    
    console.log(`[ExerciseDB] System exercises loaded from JSON file: ${normalized.length}`);
    return normalized;
  } catch (error) {
    console.warn(`[ExerciseDB] Failed to load system exercises from JSON file (${jsonUrl}):`, error);
    return [];
  }
}

// Fetch all exercises from wger.de API (with pagination) - fallback only
async function fetchExercisesFromWger(): Promise<ExerciseDBEntry[]> {
  const allExercises: ExerciseDBEntry[] = [];
  // Use exerciseinfo endpoint which includes translations
  let nextUrl: string | null = 'https://wger.de/api/v2/exerciseinfo/?limit=100&language=2'; // English language
  
  try {
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch exercises: ${response.status} ${response.statusText}`);
      }
      
      const data: WgerApiResponse = await response.json();
      
      if (!data.results || data.results.length === 0) {
        break;
      }
      
      // Transform wger exercises to our format, filtering out nulls
      const normalized = data.results
        .map((ex) => normalizeWgerExercise(ex, 'system'))
        .filter((ex): ex is ExerciseDBEntry => ex !== null);
      
      allExercises.push(...normalized);
      nextUrl = data.next;
      
      // Safety limit to prevent infinite loops
      if (allExercises.length > 10000) {
        console.warn('[ExerciseDB] Exercise fetch limit reached, stopping pagination');
        break;
      }
    }
    
    console.log(`[ExerciseDB] System exercises loaded from API (fallback): ${allExercises.length}`);
    return allExercises;
  } catch (error) {
    console.error('[ExerciseDB] Error fetching exercises from wger.de:', error);
    throw error;
  }
}

// Load system exercises: Cache -> JSON file -> API -> Stale Cache -> Empty
async function loadSystemExercisesAsync(): Promise<ExerciseDBEntry[]> {
  try {
    // Step 1: Check cache first (fastest, works offline)
    const cachedData = localStorage.getItem(SYSTEM_EXERCISES_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY);
    
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const age = Date.now() - timestamp;
      
      // Use cache if it's fresh (within cache duration)
      if (age < CACHE_DURATION_MS) {
        try {
          const cachedExercises = JSON.parse(cachedData) as ExerciseDBEntry[];
          if (cachedExercises.length > 0) {
            console.log(`[ExerciseDB] System exercises loaded from cache: ${cachedExercises.length}`);
            return cachedExercises;
          }
        } catch (e) {
          console.warn('[ExerciseDB] Invalid cache data, will reload');
        }
      }
    }
    
    // Step 2: Try to load from static JSON file (primary source)
    if (navigator.onLine) {
      const jsonExercises = await loadSystemExercisesFromJSON();
      if (jsonExercises.length > 0) {
        // Cache the results for offline use
        try {
          localStorage.setItem(SYSTEM_EXERCISES_CACHE_KEY, JSON.stringify(jsonExercises));
          localStorage.setItem(SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
          console.warn('[ExerciseDB] Failed to cache exercises, but returning loaded data');
        }
        console.log(`[ExerciseDB] Loaded system exercises: ${jsonExercises.length}`);
        return jsonExercises;
      }
    }
    
    // Step 3: Fallback to API if JSON file doesn't exist (last resort)
    if (navigator.onLine) {
      try {
        const exercises = await fetchExercisesFromWger();
        if (exercises.length > 0) {
          // Cache the results for offline use
          try {
            localStorage.setItem(SYSTEM_EXERCISES_CACHE_KEY, JSON.stringify(exercises));
            localStorage.setItem(SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log(`[ExerciseDB] System exercises loaded from API (fallback): ${exercises.length}`);
          } catch (e) {
            console.warn('[ExerciseDB] Failed to cache exercises from API, but returning loaded data');
          }
          return exercises;
        } else {
          console.warn('[ExerciseDB] API returned 0 exercises');
        }
      } catch (error) {
        console.warn('[ExerciseDB] Failed to fetch exercises from API:', error);
      }
    }
    
    // Step 4: Use stale cache if available (offline mode)
    if (cachedData) {
      try {
        const cachedExercises = JSON.parse(cachedData) as ExerciseDBEntry[];
        if (cachedExercises.length > 0) {
          console.log(`[ExerciseDB] System exercises loaded from stale cache (offline): ${cachedExercises.length}`);
          return cachedExercises;
        }
      } catch (e) {
        console.warn('[ExerciseDB] Invalid stale cache data');
      }
    }
    
    // Step 5: No exercises available - log single clear error
    console.error('[ExerciseDB] No system exercises available - JSON file missing, API failed, and cache empty. Please add /public/systemExercises.json file.');
    return [];
  } catch (error) {
    console.error('[ExerciseDB] Failed to load system exercises:', error);
    return [];
  }
}

// Synchronous version - loads from cache only (for immediate use)
function loadSystemExercises(): ExerciseDBEntry[] {
  try {
    const cachedData = localStorage.getItem(SYSTEM_EXERCISES_CACHE_KEY);
    if (cachedData) {
      const cachedExercises = JSON.parse(cachedData) as ExerciseDBEntry[];
      return cachedExercises;
    }
    return [];
  } catch (error) {
    console.error('Failed to load system exercises from cache:', error);
    return [];
  }
}

// Initialize exercises (call this on app startup)
// Ensures system exercises are always available, even after clearing cookies
export async function initializeExerciseDatabase(): Promise<void> {
  try {
    // Check if cache has too few exercises (likely old data or cleared)
    const cachedData = localStorage.getItem(SYSTEM_EXERCISES_CACHE_KEY);
    if (cachedData) {
      try {
        const cachedExercises = JSON.parse(cachedData) as ExerciseDBEntry[];
        if (cachedExercises.length < 100) {
          console.log(`Cache has only ${cachedExercises.length} exercises. Refreshing from source...`);
          // Clear the cache to force a fresh load
          localStorage.removeItem(SYSTEM_EXERCISES_CACHE_KEY);
          localStorage.removeItem(SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY);
        }
      } catch (e) {
        // Invalid cache, clear it
        localStorage.removeItem(SYSTEM_EXERCISES_CACHE_KEY);
        localStorage.removeItem(SYSTEM_EXERCISES_CACHE_TIMESTAMP_KEY);
      }
    }
    
    // Load system exercises (will use JSON -> API -> Cache priority)
    await loadSystemExercisesAsync();
  } catch (error) {
    console.error('Failed to initialize exercise database:', error);
  }
}

// Load user-created exercises from localStorage
function loadUserExercises(): ExerciseDBEntry[] {
  try {
    const data = localStorage.getItem(USER_EXERCISES_KEY);
    if (data) {
      const userExercises = JSON.parse(data) as Array<{ name: string; primaryMuscles?: string[]; secondaryMuscles?: string[]; equipment?: string[]; category?: string }>;
      return userExercises.map((ex) => normalizeUserExercise(ex, 'user'));
    }
    return [];
  } catch (error) {
    console.error('Failed to load user exercises:', error);
    return [];
  }
}

// Save user exercises to localStorage
function saveUserExercises(exercises: ExerciseDBEntry[]): void {
  try {
    // Store only the necessary fields (exclude source and id)
    const userExercises = exercises
      .filter((ex) => ex.source === 'user')
      .map(({ name, primaryMuscles, secondaryMuscles, equipment, category }) => ({
        name,
        primaryMuscles,
        secondaryMuscles,
        equipment,
        category,
      }));
    localStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(userExercises));
  } catch (error) {
    console.error('Failed to save user exercises:', error);
  }
}

// Normalize exercise name for comparison (trim, lowercase, collapse whitespace)
function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Get all exercises (system + user), combining all distinct exercises
// Deduplicates by exercise name (case-insensitive, normalized), with user exercises taking precedence
function getAllExercises(): ExerciseDBEntry[] {
  const systemExercises = loadSystemExercises();
  const userExercises = loadUserExercises();
  
  console.log(`[ExerciseDB] System exercises loaded: ${systemExercises.length}`);
  console.log(`[ExerciseDB] User exercises loaded: ${userExercises.length}`);
  
  // Filter out invalid exercises (missing name)
  const validSystemExercises = systemExercises.filter(ex => 
    ex && ex.name && typeof ex.name === 'string' && ex.name.trim()
  );
  const validUserExercises = userExercises.filter(ex => 
    ex && ex.name && typeof ex.name === 'string' && ex.name.trim()
  );
  
  // Use a Map to deduplicate by normalized name (case-insensitive, whitespace normalized)
  // User exercises will override system exercises with the same name
  const exerciseMap = new Map<string, ExerciseDBEntry>();
  
  // Add all system exercises first
  validSystemExercises.forEach((ex) => {
    const key = normalizeExerciseName(ex.name);
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, ex);
    }
  });
  
  // Add user exercises (they override system exercises with the same name)
  validUserExercises.forEach((ex) => {
    const key = normalizeExerciseName(ex.name);
    exerciseMap.set(key, ex);
  });
  
  const allExercises = Array.from(exerciseMap.values());
  console.log(`[ExerciseDB] Total exercises loaded for search: ${allExercises.length}`);
  return allExercises;
}

// Export function to get all exercises as ExerciseDBEntry array (for search interface)
export function getAllExercisesList(): ExerciseDBEntry[] {
  return getAllExercises();
}

// Filter exercises by search term (searches name, aliases, muscles, equipment)
// Uses case-insensitive substring match with basic normalization
export function filterExercises(exercises: ExerciseDBEntry[], searchTerm: string): ExerciseDBEntry[] {
  if (!searchTerm || !searchTerm.trim()) {
    return exercises;
  }
  
  // Normalize search term (trim, lowercase, collapse whitespace)
  const normalizedSearchTerm = normalizeExerciseName(searchTerm);
  
  return exercises.filter((exercise) => {
    // Search in name (normalized)
    if (exercise.name && normalizeExerciseName(exercise.name).includes(normalizedSearchTerm)) {
      return true;
    }
    
    // Search in aliases (if present in future schema)
    if ((exercise as any).aliases && Array.isArray((exercise as any).aliases)) {
      if ((exercise as any).aliases.some((alias: string) => 
        alias && normalizeExerciseName(alias).includes(normalizedSearchTerm)
      )) {
        return true;
      }
    }
    
    // Search in primary muscles
    if (exercise.primaryMuscles && exercise.primaryMuscles.some(muscle => 
      muscle && normalizeExerciseName(muscle).includes(normalizedSearchTerm)
    )) {
      return true;
    }
    
    // Search in secondary muscles
    if (exercise.secondaryMuscles && exercise.secondaryMuscles.some(muscle => 
      muscle && normalizeExerciseName(muscle).includes(normalizedSearchTerm)
    )) {
      return true;
    }
    
    // Search in equipment
    if (exercise.equipment && exercise.equipment.some(eq => 
      eq && normalizeExerciseName(eq).includes(normalizedSearchTerm)
    )) {
      return true;
    }
    
    // Search in category
    if (exercise.category && normalizeExerciseName(exercise.category).includes(normalizedSearchTerm)) {
      return true;
    }
    
    return false;
  });
}

// Backward compatibility: Load exercises as string array (legacy API)
// This maintains compatibility with existing code
export function loadExercisesDB(): string[] {
  try {
    // Check if there's legacy data (old format)
    const legacyData = localStorage.getItem(EXERCISES_DB_KEY);
    if (legacyData) {
      const legacyExercises = JSON.parse(legacyData) as string[];
      
      // Migrate legacy exercises to user exercises if they don't exist in system
      const systemExercises = loadSystemExercises();
      const systemNames = new Set(systemExercises.filter(ex => ex && ex.name).map((ex) => ex.name.toLowerCase()));
      const userExercises = loadUserExercises();
      const userNames = new Set(userExercises.filter(ex => ex && ex.name).map((ex) => ex.name.toLowerCase()));
      
      const newUserExercises: ExerciseDBEntry[] = [];
      legacyExercises.forEach((name) => {
        const lowerName = name.toLowerCase();
        if (!systemNames.has(lowerName) && !userNames.has(lowerName)) {
          newUserExercises.push(
            normalizeUserExercise({ name }, 'user')
          );
        }
      });
      
      if (newUserExercises.length > 0) {
        const allUserExercises = [...userExercises, ...newUserExercises];
        saveUserExercises(allUserExercises);
        // Clear legacy data after migration
        localStorage.removeItem(EXERCISES_DB_KEY);
      }
    }
    
    // Return all exercise names
    const allExercises = getAllExercises();
    return allExercises.map((ex) => ex.name);
  } catch (error) {
    console.error('Failed to load exercises DB:', error);
    return [];
  }
}

// Backward compatibility: Save exercises (legacy API - now no-op for system exercises)
// User exercises are handled separately
export function saveExercisesDB(exercises: string[]): void {
  // This is a no-op in the new system
  // System exercises come from JSON/API
  // User exercises are managed through addExerciseToDb
  // This function is kept for backward compatibility but does nothing
}

// Add a user-created exercise to the database
export function addExerciseToDb(exerciseName: string): void {
  const trimmedName = exerciseName.trim();
  if (!trimmedName) return;
  
  const userExercises = loadUserExercises();
  const existingNames = new Set(userExercises.filter(ex => ex && ex.name).map((ex) => ex.name.toLowerCase()));
  
  // Don't add if it already exists
  if (existingNames.has(trimmedName.toLowerCase())) {
    return;
  }
  
  // Check if it's a system exercise (don't duplicate)
  const systemExercises = loadSystemExercises();
  const systemNames = new Set(systemExercises.filter(ex => ex && ex.name).map((ex) => ex.name.toLowerCase()));
  if (systemNames.has(trimmedName.toLowerCase())) {
    return; // System exercise, no need to add as user exercise
  }
  
  // Add as user exercise
  const newExercise = normalizeUserExercise({ name: trimmedName }, 'user');
  const updatedUserExercises = [...userExercises, newExercise];
  saveUserExercises(updatedUserExercises);
}

// Search exercises with improved relevance
// Searches by name (highest priority), then by muscle groups
export function searchExercises(query: string, exercises: string[]): string[] {
  if (!query.trim()) {
    return exercises;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const allExercises = getAllExercises();
  
  // Create a map of name -> exercise entry for quick lookup
  const exerciseMap = new Map<string, ExerciseDBEntry>();
  allExercises.forEach((ex) => {
    exerciseMap.set(ex.name, ex);
  });
  
  // Score exercises based on match relevance
  interface ScoredExercise {
    name: string;
    score: number;
  }
  
  const scored: ScoredExercise[] = exercises
    .filter((name) => {
      const exercise = exerciseMap.get(name);
      if (!exercise) return true; // Include if not found (backward compatibility)
      
      // Check name match
      const nameLower = name.toLowerCase();
      if (nameLower.includes(lowerQuery)) return true;
      
      // Check muscle group matches
      const allMuscles = [
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
      ].map((m) => m.toLowerCase());
      
      return allMuscles.some((muscle) => muscle.includes(lowerQuery));
    })
    .map((name) => {
      const exercise = exerciseMap.get(name);
      let score = 0;
      
      const nameLower = name.toLowerCase();
      
      // Name matches (highest priority)
      if (nameLower === lowerQuery) {
        score = 1000; // Exact match
      } else if (nameLower.startsWith(lowerQuery)) {
        score = 500; // Starts with query
      } else if (nameLower.includes(lowerQuery)) {
        score = 100; // Contains query
      }
      
      // Muscle group matches (secondary priority)
      if (exercise) {
        const primaryMatch = exercise.primaryMuscles.some((m) =>
          m.toLowerCase().includes(lowerQuery)
        );
        const secondaryMatch = exercise.secondaryMuscles.some((m) =>
          m.toLowerCase().includes(lowerQuery)
        );
        
        if (primaryMatch) score += 50;
        if (secondaryMatch) score += 25;
      }
      
      return { name, score };
    });
  
  // Sort by score (highest first), then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });
  
  return scored.map((item) => item.name);
}

// Helper function to get exercise details (for future use)
export function getExerciseDetails(name: string): ExerciseDBEntry | null {
  const allExercises = getAllExercises();
  return allExercises.find((ex) => ex.name === name) || null;
}
