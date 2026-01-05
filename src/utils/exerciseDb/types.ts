// Exercise database types

export type SystemExercise = {
  id: string;              // stable, format: "sys:" + normalized name
  name: string;
  aliases?: string[];
  bodyPart?: string;
  target?: string;
  equipment: string[];  // Always array for backward compatibility with ExerciseList
  secondaryMuscles: string[];  // Always array for backward compatibility
  primaryMuscles: string[];  // Always array for backward compatibility with ExerciseList
  category?: string;  // For backward compatibility
  instructions?: string[];
  source: "system";
  // Additional fields from systemExercises.json
  force?: string;        // "push" | "pull"
  mechanic?: string;     // "compound" | "isolation" | null
  level?: string;        // "beginner" | "intermediate" | "advanced"
  // Anchor flag for canonical exercises
  isAnchor?: boolean;    // true if this is the canonical/default version
};

export type UserExercise = {
  id: string;              // stable, format: "usr:" + UUID
  name: string;
  aliases?: string[];
  createdAt: number;
  source: "user";
  // For backward compatibility with ExerciseList
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  category?: string;
  // Optional fields for semantic matching (if user adds them later)
  force?: string;
  mechanic?: string;
  level?: string;
};

export type AnyExercise = SystemExercise | UserExercise;

/**
 * Normalize exercise name for comparison (trim, lowercase, collapse whitespace)
 */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

