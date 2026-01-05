// Query intent detection for precision vs discovery mode

export type SearchIntent = 'precision' | 'discovery';

/**
 * Normalize query for intent detection
 */
function normalizeQueryForIntent(query: string): string {
  return query.trim().toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation except spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Detect if query is in precision mode or discovery mode
 */
export function detectSearchIntent(query: string): SearchIntent {
  if (!query || !query.trim()) {
    return 'discovery';
  }

  const normalized = normalizeQueryForIntent(query);
  const tokens = normalized.split(' ').filter(Boolean);

  // PRECISION MODE if ANY:
  // - tokens.length >= 2
  if (tokens.length >= 2) {
    return 'precision';
  }

  // - OR query contains a "specific" keyword token
  const specificKeywords = [
    'pulldown', 'pull-down', 'pull down', 'pullup', 'pull-up', 'pull up',
    'row', 'press', 'squat', 'deadlift', 'curl', 'extension', 'fly', 'raise',
    'rdl', 'hinge', 'lunge', 'dip', 'crunch', 'situp', 'sit-up', 'sit up',
    'press', 'shrug', 'calf', 'trap', 'pullover', 'kickback'
  ];
  if (specificKeywords.some(keyword => normalized.includes(keyword))) {
    return 'precision';
  }

  // - OR query contains a number/angle token
  const numberKeywords = ['incline', 'decline', '45', '30', '15', '90', '180'];
  if (numberKeywords.some(keyword => normalized.includes(keyword))) {
    return 'precision';
  }

  // DISCOVERY MODE if:
  // - tokens.length == 1 AND token is a bucket/equipment synonym
  if (tokens.length === 1) {
    const discoveryKeywords = [
      'legs', 'leg', 'back', 'chest', 'shoulders', 'shoulder', 'arms', 'arm',
      'core', 'barbell', 'bb', 'dumbbell', 'db', 'cable', 'machine', 'bodyweight',
      'bw', 'kettlebell', 'kb', 'smith', 'bands', 'band'
    ];
    if (discoveryKeywords.includes(tokens[0])) {
      return 'discovery';
    }
  }

  // Default:
  // - tokens.length == 1 => discovery
  // - tokens.length >= 2 => precision (already handled above)
  return tokens.length === 1 ? 'discovery' : 'precision';
}



