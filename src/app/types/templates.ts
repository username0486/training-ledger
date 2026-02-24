// Workout template types - canonical structure for builder, preview edit, and session

export type WorkoutExerciseNode = { type: 'exercise'; id: string; name: string };
export type WorkoutGroupNode = { type: 'group'; id: string; children: WorkoutExerciseNode[] };
export type WorkoutNode = WorkoutExerciseNode | WorkoutGroupNode;

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** @deprecated Use exerciseNodes. Flattened list for backward compat. */
  exerciseNames: string[];
  /** Canonical structure with groups. When present, used instead of exerciseNames. */
  exerciseNodes?: WorkoutNode[];
  createdAt: number;
  updatedAt: number;
}
