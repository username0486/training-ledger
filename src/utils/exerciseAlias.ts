/**
 * Exercise alias system for forgiving search
 * Supports system aliases, learned aliases, and manual aliases
 */

const ALIAS_STORAGE_KEY = 'exercise.aliases';

export type AliasSource = 'system' | 'learned' | 'manual';

export interface ExerciseAlias {
  id: string;
  exerciseId: string;
  alias: string;
  normalizedAlias: string;
  source: AliasSource;
  createdAt: number;
}

type AliasList = ExerciseAlias[];

/**
 * Normalize alias text (same as exercise name normalization)
 */
function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Load all aliases from localStorage
 */
function loadAliases(): AliasList {
  try {
    const data = localStorage.getItem(ALIAS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as AliasList;
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('[ExerciseAlias] Failed to load aliases:', error);
    return [];
  }
}

/**
 * Save aliases to localStorage
 */
function saveAliases(aliases: AliasList): void {
  try {
    localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliases));
  } catch (error) {
    console.error('[ExerciseAlias] Failed to save aliases:', error);
  }
}

/**
 * Add an alias for an exercise
 */
export function addAlias(
  exerciseId: string,
  alias: string,
  source: AliasSource = 'manual'
): ExerciseAlias {
  const normalizedAlias = normalizeAlias(alias);
  const newAlias: ExerciseAlias = {
    id: `alias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    exerciseId,
    alias: alias.trim(),
    normalizedAlias,
    source,
    createdAt: Date.now(),
  };

  const aliases = loadAliases();
  
  // Check for duplicates (same exercise + normalized alias)
  const existing = aliases.find(
    a => a.exerciseId === exerciseId && a.normalizedAlias === normalizedAlias
  );
  
  if (existing) {
    return existing; // Return existing if duplicate
  }

  aliases.push(newAlias);
  saveAliases(aliases);
  
  return newAlias;
}

/**
 * Get all aliases for an exercise
 */
export function getAliasesForExercise(exerciseId: string): ExerciseAlias[] {
  const aliases = loadAliases();
  return aliases.filter(a => a.exerciseId === exerciseId);
}

/**
 * Find exercises that have aliases matching a query
 * Returns exercise IDs with their matching aliases
 */
export function findAliasesForQuery(query: string): Array<{ exerciseId: string; alias: string }> {
  const normalizedQuery = normalizeAlias(query);
  const aliases = loadAliases();
  const matches: Array<{ exerciseId: string; alias: string }> = [];

  for (const alias of aliases) {
    // Exact match
    if (alias.normalizedAlias === normalizedQuery) {
      matches.push({ exerciseId: alias.exerciseId, alias: alias.alias });
    }
    // Prefix match
    else if (alias.normalizedAlias.startsWith(normalizedQuery)) {
      matches.push({ exerciseId: alias.exerciseId, alias: alias.alias });
    }
    // Token overlap
    else {
      const aliasTokens = alias.normalizedAlias.split(/\s+/);
      const queryTokens = normalizedQuery.split(/\s+/);
      const hasOverlap = queryTokens.some(qt => aliasTokens.includes(qt));
      if (hasOverlap) {
        matches.push({ exerciseId: alias.exerciseId, alias: alias.alias });
      }
    }
  }

  return matches;
}

/**
 * Auto-generate common aliases for an exercise
 * Examples: "bb" → "barbell", "db" → "dumbbell", "ohp" → "overhead press"
 */
export function generateCommonAliases(exerciseName: string): string[] {
  const normalized = normalizeAlias(exerciseName);
  const aliases: string[] = [];

  // Common abbreviations
  const abbrevMap: { [key: string]: string } = {
    'bb': 'barbell',
    'db': 'dumbbell',
    'kb': 'kettlebell',
    'bw': 'bodyweight',
    'ohp': 'overhead press',
    'rdl': 'romanian deadlift',
  };

  // Check if exercise name contains full form, generate abbreviation
  for (const [abbrev, full] of Object.entries(abbrevMap)) {
    if (normalized.includes(full)) {
      aliases.push(abbrev);
    }
  }

  // Generate space-removed version (e.g., "latpulldown" from "lat pulldown")
  const noSpace = normalized.replace(/\s+/g, '');
  if (noSpace !== normalized) {
    aliases.push(noSpace);
  }

  return aliases;
}

/**
 * Initialize aliases for an exercise (auto-generate + store)
 */
export function initializeAliasesForExercise(exerciseId: string, exerciseName: string): void {
  const existing = getAliasesForExercise(exerciseId);
  if (existing.length > 0) return; // Already initialized

  // Auto-generate common aliases
  const generated = generateCommonAliases(exerciseName);
  for (const alias of generated) {
    addAlias(exerciseId, alias, 'system');
  }
}

/**
 * Learn an alias from user behavior
 * Called when user types a query and selects an exercise
 */
export function learnAlias(query: string, exerciseId: string): void {
  const normalizedQuery = normalizeAlias(query);
  
  // Don't learn if query exactly matches exercise name (redundant)
  // This will be checked by caller
  
  // Check if alias already exists
  const existing = getAliasesForExercise(exerciseId);
  const alreadyExists = existing.some(a => a.normalizedAlias === normalizedQuery);
  
  if (!alreadyExists) {
    addAlias(exerciseId, query, 'learned');
  }
}

/**
 * Clean up aliases for exercises that no longer exist
 */
export function cleanupAliases(existingExerciseIds: Set<string>): void {
  const aliases = loadAliases();
  const filtered = aliases.filter(a => existingExerciseIds.has(a.exerciseId));
  
  if (filtered.length !== aliases.length) {
    saveAliases(filtered);
  }
}

