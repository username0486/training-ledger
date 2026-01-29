import { useState } from 'react';
import { ExerciseSearchBottomSheet } from './ExerciseSearchBottomSheet';
import { ExerciseSearch } from './ExerciseSearch';
import { Exercise } from '../types';
import { getGroupInfo } from '../utils/exerciseGrouping';
import { ExerciseList } from './ExerciseList';
import { ExerciseDBEntry } from '../../utils/exerciseDb';

interface PairWithSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeExercise: Exercise;
  allExercises: Exercise[];
  onSelectExercise: (exerciseId: string) => void;
  onAddNewExerciseAndPair?: (exerciseName: string) => void;
}

export function PairWithSheet({
  isOpen,
  onClose,
  activeExercise,
  allExercises,
  onSelectExercise,
  onAddNewExerciseAndPair,
}: PairWithSheetProps) {
  // Get exercises that can be paired (exclude active exercise, completed exercises, and any exercises already in a group)
  const availableExercises = allExercises.filter(
    ex => ex.id !== activeExercise.id && !ex.isComplete && !ex.groupId
  );

  // Convert session exercises to ExerciseDBEntry format for ExerciseList
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
      onClose();
    }
  };

  const handleSelectFromSearch = (exerciseName: string) => {
    // Check if it's a session exercise
    const sessionExercise = availableExercises.find(ex => ex.name === exerciseName);
    if (sessionExercise) {
      onSelectExercise(sessionExercise.id);
      onClose();
      return;
    }
    // Otherwise it's a new exercise to add and pair
    if (onAddNewExerciseAndPair) {
      onAddNewExerciseAndPair(exerciseName);
      onClose();
    }
  };

  const handleAddNewExercise = (exerciseName: string) => {
    if (onAddNewExerciseAndPair) {
      onAddNewExerciseAndPair(exerciseName);
      onClose();
    }
  };

  const inSessionExerciseNames = allExercises.map(ex => ex.name);

  return (
    <ExerciseSearchBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Pair with"
    >
      <div className="-mx-6 px-6 space-y-4">
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
            createButtonLabel="Create & pair"
            mode="PICK_PAIR_TARGET"
            inSessionExercises={inSessionExerciseNames}
            selectedExercises={[]}
          />
        </div>
      </div>
    </ExerciseSearchBottomSheet>
  );
}
