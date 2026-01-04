import { ExerciseDBEntry } from '../utils/exerciseDb';

interface ExerciseListProps {
  exercises: ExerciseDBEntry[];
  onSelect?: (exercise: ExerciseDBEntry) => void;
  selectedExercises?: string[];
  showDetails?: boolean;
  emptyMessage?: string;
}

export function ExerciseList({
  exercises,
  onSelect,
  selectedExercises = [],
  showDetails = false,
  emptyMessage = 'No exercises found',
}: ExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {exercises.map((exercise) => {
        const isSelected = selectedExercises.includes(exercise.name);
        
        return (
          <button
            key={exercise.id}
            onClick={() => onSelect?.(exercise)}
            disabled={isSelected}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              isSelected
                ? 'opacity-50 cursor-not-allowed bg-surface/50'
                : 'hover:bg-surface'
            }`}
          >
            <p className="text-text-primary font-medium">{exercise.name}</p>
            
            {showDetails && (
              <div className="mt-1.5 space-y-1">
                {/* Muscles */}
                {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.primaryMuscles.map((muscle, idx) => (
                      <span
                        key={`primary-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent"
                      >
                        {muscle}
                      </span>
                    ))}
                    {exercise.secondaryMuscles.map((muscle, idx) => (
                      <span
                        key={`secondary-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Equipment */}
                {exercise.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.equipment.map((eq, idx) => (
                      <span
                        key={`eq-${idx}`}
                        className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted border border-border-subtle"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Category */}
                {exercise.category && (
                  <p className="text-xs text-text-muted">{exercise.category}</p>
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


