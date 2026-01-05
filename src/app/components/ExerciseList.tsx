import { ExerciseDBEntry } from '../utils/exerciseDb';

interface ExerciseListProps {
  exercises: ExerciseDBEntry[] | { best: ExerciseDBEntry[]; related?: ExerciseDBEntry[] };
  onSelect?: (exercise: ExerciseDBEntry) => void;
  selectedExercises?: string[];
  showDetails?: boolean;
  emptyMessage?: string;
  showSecondaryMuscles?: boolean; // Show secondary muscles (default: true for backward compat)
  showCategory?: boolean; // Show category (default: true for backward compat)
}

export function ExerciseList({
  exercises,
  onSelect,
  selectedExercises = [],
  showDetails = false,
  emptyMessage = 'No exercises found',
  showSecondaryMuscles = true,
  showCategory = true,
}: ExerciseListProps) {
  // Defensive: normalize exercises input (handle both array and object with best/related)
  let normalizedExercises: ExerciseDBEntry[] = [];
  
  if (Array.isArray(exercises)) {
    normalizedExercises = exercises;
  } else if (exercises && typeof exercises === 'object') {
    // Handle object input: { best: Exercise[], related?: Exercise[] }
    const obj = exercises as any;
    if (Array.isArray(obj.best)) {
      normalizedExercises = [...obj.best];
    }
    if (Array.isArray(obj.related)) {
      normalizedExercises = [...normalizedExercises, ...obj.related];
    }
    
    if (import.meta.env.DEV && normalizedExercises.length === 0) {
      console.warn('[ExerciseList] Received unexpected exercise shape:', Object.keys(exercises));
    }
  }

  // Defensive: ensure exercises is always an array
  if (!Array.isArray(normalizedExercises)) {
    normalizedExercises = [];
  }

  if (normalizedExercises.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {normalizedExercises.map((exercise) => {
        // Defensive: ensure exercise has required fields
        if (!exercise || typeof exercise !== 'object') {
          if (import.meta.env.DEV) {
            console.warn('[ExerciseList] Skipping invalid exercise:', exercise);
          }
          return null;
        }

        const exerciseName = exercise.name || 'Unnamed Exercise';
        const exerciseId = exercise.id || `exercise-${Math.random()}`;
        const isSelected = selectedExercises.includes(exerciseName);
        
        // Defensive: ensure arrays exist and are arrays
        // User exercises may have undefined fields, so default to empty arrays
        const primaryMuscles = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
        const secondaryMuscles = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
        const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
        
        return (
          <button
            key={exerciseId}
            onClick={() => onSelect?.(exercise)}
            disabled={isSelected}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              isSelected
                ? 'opacity-50 cursor-not-allowed bg-surface/50'
                : 'hover:bg-surface'
            }`}
          >
            <p className="text-text-primary font-medium">{exerciseName}</p>
            
            {showDetails && (
              <div className="mt-1.5">
                {/* Primary Muscles + Equipment on one line */}
                {/* Always show meta row - use "—" if no muscle/equipment */}
                <div className="flex flex-wrap gap-1.5">
                  {primaryMuscles.length > 0 ? (
                    primaryMuscles.map((muscle, idx) => (
                      <span
                        key={`primary-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent"
                      >
                        {muscle}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle">
                      —
                    </span>
                  )}
                  {equipment.length > 0 ? (
                    equipment.map((eq, idx) => (
                      <span
                        key={`eq-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle"
                      >
                        {eq}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle">
                      —
                    </span>
                  )}
                </div>
                
                {/* Secondary Muscles (only if showSecondaryMuscles is true) - on separate line */}
                {showSecondaryMuscles && secondaryMuscles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {secondaryMuscles.map((muscle, idx) => (
                      <span
                        key={`secondary-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Category (only if showCategory is true) */}
                {showCategory && exercise.category && (
                  <p className="text-xs text-text-muted mt-1">{exercise.category}</p>
                )}
              </div>
            )}
            
            {isSelected && (
              <span className="text-text-muted text-sm ml-2">(selected)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
