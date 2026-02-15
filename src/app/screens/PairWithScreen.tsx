import { TopBar } from '../components/TopBar';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { ExerciseList } from '../components/ExerciseList';
import { Exercise } from '../types';
import { ExerciseDBEntry } from '../../utils/exerciseDb';

interface PairWithScreenProps {
  onBack: () => void;
  activeExercise: Exercise;
  allExercises: Exercise[];
  onSelectExercise: (exerciseId: string) => void;
  onAddNewExerciseAndPair?: (exerciseName: string) => void;
}

/**
 * Full-screen "Pair with" flow.
 * Replaces PairWithSheet bottom sheet.
 */
export function PairWithScreen({
  onBack,
  activeExercise,
  allExercises,
  onSelectExercise,
  onAddNewExerciseAndPair,
}: PairWithScreenProps) {
  const availableExercises = allExercises.filter(
    ex => ex.id !== activeExercise.id && !ex.isComplete && !ex.groupId
  );

  const sessionExercisesForList: ExerciseDBEntry[] = availableExercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    category: '',
    instructions: [],
    force: null,
    level: null,
    mechanic: null,
  }));

  const handleSelectFromSession = (exercise: ExerciseDBEntry) => {
    const sessionExercise = availableExercises.find(ex => ex.name === exercise.name);
    if (sessionExercise) {
      onSelectExercise(sessionExercise.id);
      onBack();
    }
  };

  const handleSelectFromSearch = (exerciseName: string) => {
    const sessionExercise = availableExercises.find(ex => ex.name === exerciseName);
    if (sessionExercise) {
      onSelectExercise(sessionExercise.id);
      onBack();
      return;
    }
    if (onAddNewExerciseAndPair) {
      onAddNewExerciseAndPair(exerciseName);
      onBack();
    }
  };

  const handleAddNewExercise = (exerciseName: string) => {
    if (onAddNewExerciseAndPair) {
      onAddNewExerciseAndPair(exerciseName);
      onBack();
    }
  };

  const inSessionExerciseNames = allExercises.map(ex => ex.name);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-panel">
      <TopBar title="Pair with" onBack={onBack} />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-5 space-y-4">
          {sessionExercisesForList.length > 0 && (
            <div>
              <div className="px-4 py-1">
                <p className="text-xs uppercase tracking-wide text-text-muted">In this session</p>
              </div>
              <ExerciseList
                exercises={sessionExercisesForList}
                onSelect={handleSelectFromSession}
                mode="PICK_PAIR_TARGET"
                inSessionExercises={inSessionExerciseNames}
                showDetails={false}
                showSecondaryMuscles={false}
                showCategory={false}
                emptyMessage=""
              />
              <div className="py-2">
                <div className="h-px bg-border-subtle" />
              </div>
            </div>
          )}

          <div>
            <ExerciseSearch
              onSelectExercise={handleSelectFromSearch}
              onAddNewExercise={handleAddNewExercise}
              placeholder="Search exercises..."
              autoFocus={sessionExercisesForList.length === 0}
              showDetails={true}
              createButtonLabel="Create & pair"
              mode="PICK_PAIR_TARGET"
              inSessionExercises={inSessionExerciseNames}
              selectedExercises={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
