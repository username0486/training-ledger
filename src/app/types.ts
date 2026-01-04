export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  isComplete?: boolean;
}

export interface Set {
  id: string;
  weight: number;
  reps: number;
  timestamp: number;
  restDuration?: number; // Rest duration in seconds before this set
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  startTime: number;
  endTime?: number;
  isComplete: boolean;
}

export interface IncompleteExerciseSession {
  exerciseName: string;
  sets: Set[];
  startTime: number;
  restTimerStart?: number | null;
}

export interface ExerciseHistory {
  exerciseId: string;
  name: string;
  lastPerformed: number;
  totalSets: number;
  workoutId: string;
}

export type Screen = 
  | { type: 'home' }
  | { type: 'workout-session'; workoutId: string }
  | { type: 'exercise-session'; exerciseName: string }
  | { type: 'workout-summary'; workoutId: string }
  | { type: 'history' };