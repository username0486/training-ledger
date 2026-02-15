import { ExerciseDBEntry } from '../utils/exerciseDb';
import { Check } from 'lucide-react';

type ExerciseSearchMode = 'ADD_TO_SESSION' | 'PICK_PAIR_TARGET' | 'SWAP' | 'DEFAULT' | 'MULTI_SELECT_TOGGLE';

interface ExerciseListProps {
  exercises: ExerciseDBEntry[] | { best: ExerciseDBEntry[]; related?: ExerciseDBEntry[] };
  onSelect?: (exercise: ExerciseDBEntry) => void;
  selectedExercises?: string[]; // Exercises to disable (for ADD_TO_SESSION mode)
  selectedExerciseIds?: Set<string>; // For MULTI_SELECT_TOGGLE: exercise IDs that are selected (tap toggles)
  inSessionExercises?: string[]; // Exercises in session (for display in PICK_PAIR_TARGET mode)
  mode?: ExerciseSearchMode;
  showDetails?: boolean;
  emptyMessage?: string;
  showSecondaryMuscles?: boolean; // Show secondary muscles (default: true for backward compat)
  showCategory?: boolean; // Show category (default: true for backward compat)
}

export function ExerciseList({
  exercises,
  onSelect,
  selectedExercises = [],
  selectedExerciseIds,
  inSessionExercises = [],
  mode = 'ADD_TO_SESSION',
  showDetails = false,
  emptyMessage = 'No exercises found',
  showSecondaryMuscles = true,
  showCategory = true,
}: ExerciseListProps) {
  // Defensive: normalize exercises input (handle both array and object with best/related)
  let normalizedExercises: ExerciseDBEntry[] = [];
  
  // Handle undefined/null exercises
  if (!exercises) {
    normalizedExercises = [];
  } else if (Array.isArray(exercises)) {
    normalizedExercises = exercises;
  } else if (typeof exercises === 'object') {
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
    // Return null for empty state (no empty-state explanations per requirements)
    return null;
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
        const isInSession = inSessionExercises.includes(exerciseName);
        const isToggleMode = mode === 'MULTI_SELECT_TOGGLE';
        const isSelectedById = isToggleMode && selectedExerciseIds?.has(exerciseId);
        // ADD_TO_SESSION: disable when selected; MULTI_SELECT_TOGGLE: never disable (tap toggles)
        const isDisabled = !isToggleMode && mode === 'ADD_TO_SESSION' && selectedExercises.includes(exerciseName);
        const isSelected = isToggleMode ? isSelectedById : (mode === 'ADD_TO_SESSION' && selectedExercises.includes(exerciseName));
        
        // Defensive: ensure arrays exist and are arrays
        // User exercises may have undefined fields, so default to empty arrays
        const primaryMuscles = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
        const secondaryMuscles = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
        const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
        
        return (
          <button
            key={exerciseId}
            onClick={(e) => {
              // Ensure tap works even when keyboard is open
              e.preventDefault();
              e.stopPropagation();
              onSelect?.(exercise);
            }}
            disabled={isDisabled}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed bg-surface/50'
                : 'hover:bg-surface'
            } ${isInSession && mode === 'PICK_PAIR_TARGET' ? 'bg-accent/5 border border-accent/20' : ''}`}
            style={{
              // Ensure taps are handled even when keyboard is visible
              touchAction: 'manipulation',
            }}
          >
            <p className="text-text-primary font-medium">{exerciseName}</p>
            
            {showDetails && (
              <div className="mt-1.5">
                {/* Primary Muscles + Equipment + In Session chip on one line */}
                {/* Always show meta row - use "—" if no muscle/equipment */}
                <div className="flex flex-wrap gap-1.5 items-center">
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
                  {/* In session / Added chip - positioned to the right */}
                  {isSelected && (
                    <span className="text-xs px-2 py-0.5 rounded bg-surface/30 text-text-muted/70 border border-border-subtle/50 flex items-center gap-1 ml-auto">
                      <Check className="w-3 h-3" />
                      <span>Added</span>
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
            
            {isInSession && mode === 'PICK_PAIR_TARGET' && (
              <span className="text-accent text-xs ml-2">(in session)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
