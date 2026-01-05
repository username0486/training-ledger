// Exercise data normalization and bucket mapping
// Provides deterministic mapping for equipment and muscle/body buckets

export type EquipmentLabel = 
  | 'Barbell' 
  | 'Dumbbell' 
  | 'Machine' 
  | 'Cable' 
  | 'Bodyweight' 
  | 'Kettlebell' 
  | 'Smith' 
  | 'Bands';

export type MuscleBucket = 
  | 'Legs' 
  | 'Chest' 
  | 'Back' 
  | 'Shoulders' 
  | 'Arms' 
  | 'Core' 
  | 'Full body';

/**
 * Normalize equipment string to standard label
 */
export function normalizeEquipment(equipment: string | string[] | undefined): EquipmentLabel | null {
  if (!equipment) return null;
  
  const eqStr = Array.isArray(equipment) ? equipment[0] : equipment;
  if (!eqStr || typeof eqStr !== 'string') return null;
  
  const normalized = eqStr.trim().toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
  
  // Direct matches
  const directMap: Record<string, EquipmentLabel> = {
    'barbell': 'Barbell',
    'bb': 'Barbell',
    'dumbbell': 'Dumbbell',
    'db': 'Dumbbell',
    'dumbell': 'Dumbbell', // common typo
    'machine': 'Machine',
    'cable': 'Cable',
    'bodyweight': 'Bodyweight',
    'body weight': 'Bodyweight',
    'body only': 'Bodyweight',
    'bodyonly': 'Bodyweight',
    'bw': 'Bodyweight',
    'kettlebell': 'Kettlebell',
    'kb': 'Kettlebell',
    'smith': 'Smith',
    'smith machine': 'Smith',
    'bands': 'Bands',
    'resistance bands': 'Bands',
    'band': 'Bands',
  };
  
  if (directMap[normalized]) {
    return directMap[normalized];
  }
  
  // Partial matches
  if (normalized.includes('barbell') || normalized.includes('bar')) return 'Barbell';
  if (normalized.includes('dumb')) return 'Dumbbell';
  if (normalized.includes('machine') && !normalized.includes('smith')) return 'Machine';
  if (normalized.includes('cable')) return 'Cable';
  if ((normalized.includes('body') && normalized.includes('only')) || 
      (normalized.includes('body') && normalized.includes('weight')) ||
      (normalized.includes('bodyweight'))) {
    if (!normalized.includes('dumb')) return 'Bodyweight';
  }
  if (normalized.includes('kettle')) return 'Kettlebell';
  if (normalized.includes('smith')) return 'Smith';
  if (normalized.includes('band')) return 'Bands';
  
  return null;
}

/**
 * Derive muscle bucket from target, bodyPart, or primaryMuscles fields
 */
export function deriveMuscleBucket(
  target?: string | string[],
  bodyPart?: string | string[],
  primaryMuscles?: string | string[]
): MuscleBucket | null {
  // Combine target, bodyPart, and primaryMuscles into a single search string
  const targets = Array.isArray(target) ? target : (target ? [target] : []);
  const bodyParts = Array.isArray(bodyPart) ? bodyPart : (bodyPart ? [bodyPart] : []);
  const muscles = Array.isArray(primaryMuscles) ? primaryMuscles : (primaryMuscles ? [primaryMuscles] : []);
  const allTerms = [...targets, ...bodyParts, ...muscles].map(t => 
    typeof t === 'string' ? t.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ') : ''
  ).filter(Boolean).join(' ');
  
  if (!allTerms) return null;
  
  // LEGS
  const legsTerms = [
    'quad', 'quadricep', 'hamstring', 'glute', 'calf', 'calves',
    'adductor', 'abductor', 'thigh', 'leg', 'legs'
  ];
  if (legsTerms.some(term => allTerms.includes(term))) return 'Legs';
  
  // CHEST
  const chestTerms = [
    'chest', 'pectoral', 'pec', 'pecs'
  ];
  if (chestTerms.some(term => allTerms.includes(term))) return 'Chest';
  
  // BACK
  const backTerms = [
    'lat', 'latissimus', 'upper back', 'lower back', 'trap', 'trapezius',
    'rhomboid', 'erector', 'spine', 'spinae', 'back'
  ];
  if (backTerms.some(term => allTerms.includes(term))) return 'Back';
  
  // SHOULDERS
  const shoulderTerms = [
    'delt', 'deltoid', 'anterior deltoid', 'lateral deltoid', 'posterior deltoid',
    'shoulder', 'shoulders'
  ];
  if (shoulderTerms.some(term => allTerms.includes(term))) return 'Shoulders';
  
  // ARMS
  const armsTerms = [
    'bicep', 'tricep', 'forearm', 'brachialis', 'brachioradialis', 'arm', 'arms'
  ];
  if (armsTerms.some(term => allTerms.includes(term))) return 'Arms';
  
  // CORE
  const coreTerms = [
    'ab', 'abs', 'abdominal', 'oblique', 'core', 'serratus'
  ];
  if (coreTerms.some(term => allTerms.includes(term))) return 'Core';
  
  // FULL BODY (only if explicitly indicated)
  const fullBodyTerms = [
    'full body', 'fullbody', 'total body', 'whole body'
  ];
  if (fullBodyTerms.some(term => allTerms.includes(term))) return 'Full body';
  
  return null;
}

/**
 * Extract query hints (equipment and bucket) from search query
 */
export function extractQueryHints(query: string): {
  equipment: EquipmentLabel | null;
  bucket: MuscleBucket | null;
} {
  const normalized = query.trim().toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
  
  const tokens = normalized.split(/\s+/).filter(Boolean);
  
  // Equipment hints
  let equipment: EquipmentLabel | null = null;
  const equipmentSynonyms: Record<string, EquipmentLabel> = {
    'bb': 'Barbell',
    'barbell': 'Barbell',
    'bar': 'Barbell',
    'db': 'Dumbbell',
    'dumbbell': 'Dumbbell',
    'dumbell': 'Dumbbell',
    'machine': 'Machine',
    'cable': 'Cable',
    'bw': 'Bodyweight',
    'bodyweight': 'Bodyweight',
    'body': 'Bodyweight',
    'kb': 'Kettlebell',
    'kettlebell': 'Kettlebell',
    'smith': 'Smith',
    'bands': 'Bands',
    'band': 'Bands',
  };
  
  for (const token of tokens) {
    if (equipmentSynonyms[token]) {
      equipment = equipmentSynonyms[token];
      break;
    }
  }
  
  // Bucket hints
  let bucket: MuscleBucket | null = null;
  const bucketSynonyms: Record<string, MuscleBucket> = {
    'leg': 'Legs',
    'legs': 'Legs',
    'quad': 'Legs',
    'ham': 'Legs',
    'glute': 'Legs',
    'calf': 'Legs',
    'thigh': 'Legs',
    'chest': 'Chest',
    'pec': 'Chest',
    'pecs': 'Chest',
    'back': 'Back',
    'lat': 'Back',
    'trap': 'Back',
    'shoulder': 'Shoulders',
    'shoulders': 'Shoulders',
    'delt': 'Shoulders',
    'arm': 'Arms',
    'arms': 'Arms',
    'bicep': 'Arms',
    'tricep': 'Arms',
    'core': 'Core',
    'abs': 'Core',
    'ab': 'Core',
  };
  
  for (const token of tokens) {
    if (bucketSynonyms[token]) {
      bucket = bucketSynonyms[token];
      break;
    }
  }
  
  return { equipment, bucket };
}

