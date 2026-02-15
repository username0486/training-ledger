import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { ExerciseList } from '../components/ExerciseList';
import { Exercise } from '../types';
import { ExerciseDBEntry } from '../../utils/exerciseDb';

interface SwapExerciseScreenProps {
  onBack: () => void;
  groupMembers: Exercise[];
  allExercises: Exercise[];
  initialExerciseToReplace?: string;
  onSwapWithExisting?: (exerciseIdToReplace: string, replacementExerciseId: string) => void;
  onAddNewExerciseAndSwap?: (exerciseIdToReplace: string, newExerciseName: string) => void;
}

/**
 * Full-screen "Swap exercise in superset" flow.
 * Replaces SwapExerciseSheet bottom sheet.
 * Two steps: 1) Choose member to replace, 2) Search for replacement.
 */
export function SwapExerciseScreen({
  onBack,
  groupMembers,
  allExercises,
  initialExerciseToReplace,
  onSwapWithExisting,
  onAddNewExerciseAndSwap,
}: SwapExerciseScreenProps) {
  const [memberToReplace, setMemberToReplace] = useState<Exercise | null>(null);

  useEffect(() => {
    if (initialExerciseToReplace && !memberToReplace) {
      const exercise = groupMembers.find(ex => ex.id === initialExerciseToReplace);
      if (exercise) {
        setMemberToReplace(exercise);
      }
    }
  }, [initialExerciseToReplace, groupMembers, memberToReplace]);

  const handleClose = () => {
    setMemberToReplace(null);
    onBack();
  };

  if (!memberToReplace) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-panel">
        <TopBar title="Swap exercise" onBack={handleClose} />
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-muted">
              Choose an exercise to replace in the superset.
            </p>
            <div className="space-y-2">
              {groupMembers.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => setMemberToReplace(exercise)}
                  className="w-full p-3 text-left rounded-lg border border-border-subtle bg-surface/30 hover:bg-surface/50 transition-colors"
                >
                  <p className="font-medium text-text-primary">{exercise.name}</p>
                  {exercise.sets.length > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''} logged
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableExercises = allExercises.filter(
    ex => ex.id !== memberToReplace.id && !ex.groupId
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
    if (sessionExercise && onSwapWithExisting) {
      onSwapWithExisting(memberToReplace.id, sessionExercise.id);
      handleClose();
    }
  };

  const handleSelectFromSearch = (exerciseName: string) => {
    const sessionExercise = availableExercises.find(ex => ex.name === exerciseName);
    if (sessionExercise && onSwapWithExisting) {
      onSwapWithExisting(memberToReplace.id, sessionExercise.id);
      handleClose();
    } else if (onAddNewExerciseAndSwap) {
      onAddNewExerciseAndSwap(memberToReplace.id, exerciseName);
      handleClose();
    }
  };

  const handleAddNewExercise = (exerciseName: string) => {
    if (onAddNewExerciseAndSwap) {
      onAddNewExerciseAndSwap(memberToReplace.id, exerciseName);
      handleClose();
    }
  };

  const inSessionExerciseNames = allExercises.map(ex => ex.name);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-panel">
      <TopBar
        title={`Replace ${memberToReplace.name}`}
        onBack={() => setMemberToReplace(null)}
      />
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
              createButtonLabel="Create & swap"
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
