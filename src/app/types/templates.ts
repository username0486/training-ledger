// Workout template types
export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseNames: string[]; // Ordered list of exercise names
  createdAt: number;
  updatedAt: number;
}
