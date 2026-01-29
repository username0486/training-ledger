import { useState, useEffect } from 'react';
import { X, MoreHorizontal, UserMinus, ArrowRightLeft, SkipForward } from 'lucide-react';
import { Exercise, Set } from '../types';
import { formatWeight, formatWeightForDisplay, convertKgToDisplay } from '../../utils/weightFormat';
import { CompactBottomSheet } from './CompactBottomSheet';
import { OverflowActionGroup } from './OverflowActionGroup';
import { CompletedSetsPanel } from './CompletedSetsPanel';
import { RepsWeightGrid } from './RepsWeightGrid';
import { LastSessionStats } from './LastSessionStats';

interface ExerciseCardLoggerProps {
  exercise: Exercise;
  lastSessionData?: { sets: Array<{ weight: number; reps: number }>; date: number } | null;
  onInputChange: (exerciseId: string, weight: string, reps: string) => void;
  onRemove?: (exerciseId: string) => void;
  weight: string;
  reps: string;
  showRemove?: boolean;
  // Group-specific props
  isInGroup?: boolean;
  onRemoveFromGroup?: (exerciseId: string) => void;
  onSwapExercise?: (exerciseId: string) => void;
  onSkipExercise?: (exerciseId: string) => void;
  // Set management
  onDeleteSet?: (exerciseId: string, setId: string) => void;
  onUpdateSet?: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onSelectSet?: (exerciseId: string, setId: string, setIndex: number) => void;
}

export function ExerciseCardLogger({
  exercise,
  lastSessionData,
  onInputChange,
  onRemove,
  weight,
  reps,
  showRemove = false,
  isInGroup = false,
  onRemoveFromGroup,
  onSwapExercise,
  onSkipExercise,
  onDeleteSet,
  onUpdateSet,
  onSelectSet,
}: ExerciseCardLoggerProps) {

  // Bottom sheet state for exercise-level overflow (in group)
  const [showExerciseOverflowSheet, setShowExerciseOverflowSheet] = useState(false);

  return (
    <>
      <div className="bg-surface/50 rounded-xl border border-border-subtle p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-text-primary">{exercise.name}</h3>
          <div className="flex items-center gap-1">
            {isInGroup && !exercise.isComplete && (
              <button 
                onClick={() => setShowExerciseOverflowSheet(true)}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface/50"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
            {showRemove && onRemove && (
              <button
                onClick={() => onRemove(exercise.id)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      {/* Inputs */}
      <RepsWeightGrid
        weight={weight}
        reps={reps}
        onWeightChange={(value) => onInputChange(exercise.id, value, reps)}
        onRepsChange={(value) => onInputChange(exercise.id, weight, value)}
      />

      {/* Completed Sets - matches standalone exercise styling */}
      {exercise.sets.length > 0 && (
        <CompletedSetsPanel
          sets={exercise.sets}
          onSelectSet={onSelectSet ? (setId, setIndex) => onSelectSet(exercise.id, setId, setIndex) : undefined}
          exerciseId={exercise.id}
        />
      )}

      {/* Last session chips - below inputs (only shown when no sets logged yet) */}
      {/* Visibility: ONLY show when exercise has 0 committed sets in current session */}
      {/* Data source: lastSessionData is strictly from previous completed sessions, never current session */}
      {exercise.sets.length === 0 && lastSessionData && lastSessionData.sets && lastSessionData.sets.length > 0 && (() => {
        // Create defensive copy to prevent any mutation
        const lastSessionCopy = {
          sets: [...lastSessionData.sets], // Copy array to prevent mutation
          date: lastSessionData.date,
        };
        
        return (
          <LastSessionStats
            lastSessionData={lastSessionCopy}
            onChipPress={(chipWeightKg, chipReps) => {
              // Chip tap only prefills draft inputs - does NOT log a set
              // Set will only be logged when user taps "Add Set" button
              // chipWeightKg is in kg (canonical), convert to display unit for input
              const displayWeight = convertKgToDisplay(chipWeightKg);
              onInputChange(exercise.id, displayWeight.toString(), chipReps.toString());
            }}
          />
        );
      })()}
    </div>

      {/* Exercise-level overflow bottom sheet (in group) */}
      {isInGroup && !exercise.isComplete && (
        <CompactBottomSheet
          isOpen={showExerciseOverflowSheet}
          onClose={() => setShowExerciseOverflowSheet(false)}
        >
          <OverflowActionGroup
            actions={[
              ...(onRemoveFromGroup ? [{
                label: 'Remove from group',
                icon: UserMinus,
                onPress: () => {
                  onRemoveFromGroup(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onSwapExercise ? [{
                label: 'Swap exercise…',
                icon: ArrowRightLeft,
                onPress: () => {
                  onSwapExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onSkipExercise ? [{
                label: 'Skip',
                icon: SkipForward,
                onPress: () => {
                  onSkipExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
            ]}
          />
        </CompactBottomSheet>
      )}
    </>
  );
}
