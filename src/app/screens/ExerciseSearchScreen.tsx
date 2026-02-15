import { TopBar } from '../components/TopBar';
import { ExerciseSearch } from '../components/ExerciseSearch';

type ExerciseSearchMode = 'ADD_TO_SESSION' | 'PICK_PAIR_TARGET' | 'SWAP' | 'DEFAULT';

interface ExerciseSearchScreenProps {
  title: string;
  onBack: () => void;
  onSelectExercise: (exerciseName: string) => void;
  onAddNewExercise?: (exerciseName: string) => void;
  selectedExercises?: string[];
  inSessionExercises?: string[];
  mode?: ExerciseSearchMode;
  placeholder?: string;
  autoFocus?: boolean;
  showDetails?: boolean;
  createButtonLabel?: string;
  swapContext?: {
    originalExercise: { id: string; name: string; source: string; primaryMuscles?: string[]; secondaryMuscles?: string[]; equipment?: string[] };
  };
}

/**
 * Full-screen exercise search route.
 * Replaces bottom sheet search modals across the app.
 * Single-select: tap to select is the primary action (no bottom CTA).
 */
export function ExerciseSearchScreen({
  title,
  onBack,
  onSelectExercise,
  onAddNewExercise,
  selectedExercises = [],
  inSessionExercises = [],
  mode = 'ADD_TO_SESSION',
  placeholder = 'Search exercises...',
  autoFocus = true,
  showDetails = true,
  createButtonLabel = 'Create & add',
  swapContext,
}: ExerciseSearchScreenProps) {
  return (
    <div className="flex flex-1 flex-col min-h-0 bg-panel">
      <TopBar title={title} onBack={onBack} hideBorder />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-5">
          <ExerciseSearch
            onSelectExercise={onSelectExercise}
            onAddNewExercise={onAddNewExercise}
            selectedExercises={selectedExercises}
            inSessionExercises={inSessionExercises}
            mode={mode}
            placeholder={placeholder}
            autoFocus={autoFocus}
            showDetails={showDetails}
            createButtonLabel={createButtonLabel}
            swapContext={swapContext}
          />
        </div>
      </div>
    </div>
  );
}
