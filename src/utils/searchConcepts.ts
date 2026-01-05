/**
 * Query concept inference
 * Parses user query to infer muscle, equipment, force, mechanic, category
 */

import { normalize } from './searchNormalize';

export interface QueryConcepts {
  muscles: string[];      // Canonical muscle tags
  equipment: string[];   // Equipment values
  force?: string;        // "push" | "pull"
  mechanic?: string;     // "compound" | "isolation"
  category?: string;     // "strength" | "stretching" | etc.
}

/**
 * Muscle synonyms mapping to canonical tags
 * Based on common exercise database muscle tags
 */
const MUSCLE_SYNONYMS: { [key: string]: string[] } = {
  // Chest
  'chest': ['chest', 'pectorals', 'pecs', 'pectoral'],
  'pectorals': ['chest', 'pectorals', 'pecs', 'pectoral'],
  'pecs': ['chest', 'pectorals', 'pecs', 'pectoral'],
  'pectoral': ['chest', 'pectorals', 'pecs', 'pectoral'],
  
  // Back
  'back': ['lats', 'latissimus', 'back', 'upper back', 'lower back', 'traps', 'trapezius', 'rhomboids'],
  'lats': ['lats', 'latissimus', 'back'],
  'latissimus': ['lats', 'latissimus', 'back'],
  'traps': ['traps', 'trapezius', 'back'],
  'trapezius': ['traps', 'trapezius', 'back'],
  
  // Shoulders
  'shoulders': ['shoulders', 'delts', 'deltoids', 'deltoid'],
  'delts': ['shoulders', 'delts', 'deltoids', 'deltoid'],
  'deltoids': ['shoulders', 'delts', 'deltoids', 'deltoid'],
  'deltoid': ['shoulders', 'delts', 'deltoids', 'deltoid'],
  
  // Arms
  'arms': ['biceps', 'triceps', 'forearms', 'arms'],
  'biceps': ['biceps', 'bicep'],
  'bicep': ['biceps', 'bicep'],
  'triceps': ['triceps', 'tricep'],
  'tricep': ['triceps', 'tricep'],
  'forearms': ['forearms', 'forearm'],
  
  // Legs
  'legs': ['quadriceps', 'quads', 'hamstrings', 'hamstring', 'glutes', 'glute', 'calves', 'calf', 'legs'],
  'quads': ['quadriceps', 'quads', 'legs'],
  'quadriceps': ['quadriceps', 'quads', 'legs'],
  'hamstrings': ['hamstrings', 'hamstring', 'legs'],
  'hamstring': ['hamstrings', 'hamstring', 'legs'],
  'glutes': ['glutes', 'glute', 'legs'],
  'glute': ['glutes', 'glute', 'legs'],
  'calves': ['calves', 'calf', 'legs'],
  'calf': ['calves', 'calf', 'legs'],
  
  // Core
  'core': ['abdominals', 'abs', 'core', 'obliques', 'oblique'],
  'abs': ['abdominals', 'abs', 'core'],
  'abdominals': ['abdominals', 'abs', 'core'],
  'obliques': ['obliques', 'oblique', 'core'],
  'oblique': ['obliques', 'oblique', 'core'],
};

/**
 * Equipment synonyms mapping to canonical values
 */
const EQUIPMENT_SYNONYMS: { [key: string]: string[] } = {
  'barbell': ['barbell', 'bb', 'bar'],
  'dumbbell': ['dumbbell', 'db', 'dumbbells'],
  'cable': ['cable', 'cables'],
  'machine': ['machine', 'machines'],
  'body weight': ['body weight', 'bodyweight', 'bw', 'body only', 'no equipment'],
  'bodyweight': ['body weight', 'bodyweight', 'bw', 'body only', 'no equipment'],
  'bw': ['body weight', 'bodyweight', 'bw', 'body only', 'no equipment'],
  'kettlebell': ['kettlebell', 'kb', 'kettlebells'],
  'smith': ['smith', 'smith machine'],
};

/**
 * Force synonyms
 */
const FORCE_SYNONYMS: { [key: string]: string } = {
  'push': 'push',
  'pushing': 'push',
  'press': 'push',
  'pressing': 'push',
  'pull': 'pull',
  'pulling': 'pull',
  'row': 'pull',
  'rowing': 'pull',
  'curl': 'pull',
  'curling': 'pull',
};

/**
 * Mechanic synonyms
 */
const MECHANIC_SYNONYMS: { [key: string]: string } = {
  'compound': 'compound',
  'isolation': 'isolation',
  'isolated': 'isolation',
};

/**
 * Category synonyms
 */
const CATEGORY_SYNONYMS: { [key: string]: string } = {
  'strength': 'strength',
  'stretching': 'stretching',
  'cardio': 'cardio',
  'olympic': 'olympic',
  'strongman': 'strongman',
};

/**
 * Infer concepts from query
 */
export function inferQueryConcepts(query: string): QueryConcepts {
  const normalized = normalize(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  
  const concepts: QueryConcepts = {
    muscles: [],
    equipment: [],
  };
  
  const foundMuscles = new Set<string>();
  const foundEquipment = new Set<string>();
  
  // Check each token against synonyms
  for (const token of tokens) {
    // Check muscle synonyms
    for (const [synonym, canonical] of Object.entries(MUSCLE_SYNONYMS)) {
      if (token.includes(synonym) || synonym.includes(token)) {
        canonical.forEach(m => foundMuscles.add(m));
      }
    }
    
    // Check equipment synonyms
    for (const [synonym, canonical] of Object.entries(EQUIPMENT_SYNONYMS)) {
      if (token === synonym || canonical.includes(token)) {
        canonical.forEach(eq => foundEquipment.add(eq));
      }
    }
    
    // Check force
    if (!concepts.force) {
      for (const [synonym, canonical] of Object.entries(FORCE_SYNONYMS)) {
        if (token === synonym || token.includes(synonym)) {
          concepts.force = canonical;
          break;
        }
      }
    }
    
    // Check mechanic
    if (!concepts.mechanic) {
      for (const [synonym, canonical] of Object.entries(MECHANIC_SYNONYMS)) {
        if (token === synonym || token.includes(synonym)) {
          concepts.mechanic = canonical;
          break;
        }
      }
    }
    
    // Check category
    if (!concepts.category) {
      for (const [synonym, canonical] of Object.entries(CATEGORY_SYNONYMS)) {
        if (token === synonym || token.includes(synonym)) {
          concepts.category = canonical;
          break;
        }
      }
    }
  }
  
  // Also check full query string for multi-word matches
  const fullQuery = normalized;
  
  // Multi-word muscle matches (e.g., "chest press" → chest)
  for (const [synonym, canonical] of Object.entries(MUSCLE_SYNONYMS)) {
    if (fullQuery.includes(synonym)) {
      canonical.forEach(m => foundMuscles.add(m));
    }
  }
  
  // Multi-word equipment matches (e.g., "body weight" → body weight)
  for (const [synonym, canonical] of Object.entries(EQUIPMENT_SYNONYMS)) {
    if (fullQuery.includes(synonym)) {
      canonical.forEach(eq => foundEquipment.add(eq));
    }
  }
  
  concepts.muscles = Array.from(foundMuscles);
  concepts.equipment = Array.from(foundEquipment);
  
  return concepts;
}

