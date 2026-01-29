import { useState, useEffect } from 'react';
import { ExerciseSearchBottomSheet } from './ExerciseSearchBottomSheet';
import { ExerciseSearch } from './ExerciseSearch';
import { ExerciseList } from './ExerciseList';
import { Exercise } from '../types';
import { ExerciseDBEntry } from '../../utils/exerciseDb';
import { Button } from './Button';
import { ChevronLeft } from 'lucide-react';

interface SwapExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: Exercise[];
  allExercises: Exercise[];
  initialExerciseToReplace?: string; // If provided, skip step 1 and go directly to step 2
  onSwapWithExisting?: (exerciseIdToReplace: string, replacementExerciseId: string) => void;
  onAddNewExerciseAndSwap?: (exerciseIdToReplace: string, newExerciseName: string) => void;
}

export function SwapExerciseSheet({
  isOpen,
  onClose,
  groupMembers,
  allExercises,
  initialExerciseToReplace,
  onSwapWithExisting,
  onAddNewExerciseAndSwap,
}: SwapExerciseSheetProps) {
  const [memberToReplace, setMemberToReplace] = useState<Exercise | null>(null);

  // Reset memberToReplace when sheet closes, or set it from initialExerciseToReplace
  useEffect(() => {
    if (!isOpen) {
      setMemberToReplace(null);
    } else if (initialExerciseToReplace && !memberToReplace) {
      const exercise = groupMembers.find(ex => ex.id === initialExerciseToReplace);
      if (exercise) {
        setMemberToReplace(exercise);
      }
    }
  }, [isOpen, initialExerciseToReplace, groupMembers, memberToReplace]);

  const handleClose = () => {
    setMemberToReplace(null);
    onClose();
  };

  if (!memberToReplace) {
    // Step 1: Choose which member to replace
    return (
      <ExerciseSearchBottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Swap exercise"
      >
        <div className="space-y-4">
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

          <Button variant="neutral" onClick={handleClose} className="w-full">
            Cancel
          </Button>
        </div>
      </ExerciseSearchBottomSheet>
    );
  }

  // Step 2: Choose replacement exercise
  // Exclude the member being replaced and any exercises already in a group
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
    if (sessionExercise && onSwapWithExisting && memberToReplace) {
      onSwapWithExisting(memberToReplace.id, sessionExercise.id);
      handleClose();
    }
  };

  const handleSelectFromSearch = (exerciseName: string) => {
    const sessionExercise = availableExercises.find(ex => ex.name === exerciseName);
    if (sessionExercise && onSwapWithExisting && memberToReplace) {
      onSwapWithExisting(memberToReplace.id, sessionExercise.id);
      handleClose();
    } else if (onAddNewExerciseAndSwap && memberToReplace) {
      onAddNewExerciseAndSwap(memberToReplace.id, exerciseName);
      handleClose();
    }
  };

  const handleAddNewExercise = (exerciseName: string) => {
    if (onAddNewExerciseAndSwap && memberToReplace) {
      onAddNewExerciseAndSwap(memberToReplace.id, exerciseName);
      handleClose();
    }
  };

  const inSessionExerciseNames = allExercises.map(ex => ex.name);

  return (
    <ExerciseSearchBottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={`Replace ${memberToReplace.name}`}
    >
      <div className="-mx-6 px-6 space-y-4">
        {/* Back button */}
        <button
          onClick={() => setMemberToReplace(null)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {/* In this session list */}
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
              <div className="h-px bg-border-subtle"></div>
            </div>
          </div>
        )}

        {/* Search for new exercise */}
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
    </ExerciseSearchBottomSheet>
  );
}
