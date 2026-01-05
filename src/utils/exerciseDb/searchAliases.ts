// Alias expansion and normalization for exercise search

import { normalizeExerciseName } from './types';
import { AnyExercise } from './types';

/**
 * Generate search aliases from exercise name
 */
export function generateSearchAliases(name: string): string[] {
  const aliases: string[] = [];
  const normalized = normalizeExerciseName(name);

  // Common variant expansions
  const variants: Array<[RegExp, string]> = [
    [/pull\s*down/gi, 'pulldown'],
    [/pulldown/gi, 'pull down'],
    [/pull\s*up/gi, 'pullup'],
    [/pullup/gi, 'pull up'],
    [/pull\s*-?\s*up/gi, 'pull-up'],
    [/romanian\s+deadlift/gi, 'rdl'],
    [/rdl/gi, 'romanian deadlift'],
    [/overhead\s+press/gi, 'ohp'],
    [/ohp/gi, 'overhead press'],
    [/dumbbell/gi, 'db'],
    [/db\b/gi, 'dumbbell'],
    [/barbell/gi, 'bb'],
    [/bb\b/gi, 'barbell'],
    [/sit\s*-?\s*up/gi, 'situp'],
    [/situp/gi, 'sit up'],
    [/sit\s+up/gi, 'sit-up'],
  ];

  for (const [pattern, replacement] of variants) {
    if (pattern.test(normalized)) {
      const variant = normalized.replace(pattern, replacement);
      if (variant !== normalized) {
        aliases.push(variant);
      }
    }
  }

  return aliases;
}

/**
 * Build search text for an exercise (name + aliases + generated aliases)
 */
export function buildSearchText(exercise: AnyExercise): string {
  const parts: string[] = [exercise.name];

  // Add existing aliases
  if (exercise.aliases && exercise.aliases.length > 0) {
    parts.push(...exercise.aliases);
  }

  // Add generated aliases
  const generated = generateSearchAliases(exercise.name);
  parts.push(...generated);

  return parts.join(' ').toLowerCase();
}



