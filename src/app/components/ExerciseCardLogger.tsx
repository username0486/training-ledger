import { useState } from 'react';
import { X, MoreHorizontal, UserMinus, ArrowRightLeft, SkipForward, Link2, ListEnd, Trash2, RotateCcw } from 'lucide-react';
import { Exercise, Set, Workout } from '../types';
import { formatWeight, formatWeightForDisplay, convertKgToDisplay } from '../../utils/weightFormat';
import { CompactBottomSheet } from './CompactBottomSheet';
import { OverflowActionGroup } from './OverflowActionGroup';
import { CompletedSetsPanel } from './CompletedSetsPanel';
import { RepsWeightGrid } from './RepsWeightGrid';
import { LastSessionStats } from './LastSessionStats';
import { ExerciseHistoryBottomSheet } from './ExerciseHistoryBottomSheet';
import { getRecentSessionsForExercise } from '../utils/storage';
import { getComparisonFlag } from '../utils/exerciseComparison';

interface ExerciseCardLoggerProps {
  exercise: Exercise;
  lastSessionData?: { sets: Array<{ weight: number; reps: number }>; date: number } | null;
  allWorkouts?: Workout[]; // All workouts for history and comparison
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
  onUnskipExercise?: (exerciseId: string) => void;
  onDeferExercise?: (exerciseId: string) => void;
  onDeleteExercise?: (exerciseId: string) => void;
  onPairExercise?: () => void;
  // Set management
  onDeleteSet?: (exerciseId: string, setId: string) => void;
  onUpdateSet?: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onSelectSet?: (exerciseId: string, setId: string, setIndex: number) => void;
  // Timer props
  nowMs?: number; // current timestamp for consistent elapsed time computation
}

export function ExerciseCardLogger({
  exercise,
  lastSessionData,
  allWorkouts = [],
  onInputChange,
  onRemove,
  weight,
  reps,
  showRemove = false,
  isInGroup = false,
  onRemoveFromGroup,
  onSwapExercise,
  onSkipExercise,
  onUnskipExercise,
  onDeferExercise,
  onDeleteExercise,
  onPairExercise,
  onDeleteSet,
  onUpdateSet,
  onSelectSet,
  nowMs = Date.now(),
}: ExerciseCardLoggerProps) {

  // Bottom sheet state for exercise-level overflow (in group)
  const [showExerciseOverflowSheet, setShowExerciseOverflowSheet] = useState(false);
  // Bottom sheet state for exercise history
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  
  // Get comparison flag (only compute if we have lastSessionData and no sets logged yet)
  const comparisonFlag = exercise.sets.length === 0 && lastSessionData && allWorkouts.length > 0
    ? getComparisonFlag(exercise.name, allWorkouts)
    : null;
  
  // Get last 4 sessions for bottom sheet
  const historySessions = allWorkouts.length > 0
    ? getRecentSessionsForExercise(exercise.name, allWorkouts, 4)
    : [];

  const isSkipped = !!exercise.isSkipped;

  return (
    <>
      <div className={`rounded-xl border p-3 space-y-2 transition-opacity ${isSkipped ? 'bg-surface/30 border-border-subtle/50 opacity-70' : 'bg-surface/50 border-border-subtle'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-medium ${isSkipped ? 'text-text-muted' : 'text-text-primary'}`}>{exercise.name}</h3>
            {isSkipped && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-text-muted/20 text-text-muted text-xs font-medium">
                Skipped
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isInGroup && (!exercise.isComplete || isSkipped) && (
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

      {/* Inputs - disabled/placeholder when skipped */}
      {isSkipped ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/30 rounded-xl p-3 border border-border-subtle/50">
            <span className="block text-xs uppercase tracking-wider text-text-muted/70 mb-2 font-medium">Weight</span>
            <span className="text-2xl font-bold tabular-nums text-text-muted/70">—</span>
          </div>
          <div className="bg-surface/30 rounded-xl p-3 border border-border-subtle/50">
            <span className="block text-xs uppercase tracking-wider text-text-muted/70 mb-2 font-medium">Reps</span>
            <span className="text-2xl font-bold tabular-nums text-text-muted/70">—</span>
          </div>
        </div>
      ) : (
        <RepsWeightGrid
          weight={weight}
          reps={reps}
          onWeightChange={(value) => onInputChange(exercise.id, value, reps)}
          onRepsChange={(value) => onInputChange(exercise.id, weight, value)}
        />
      )}

      {/* Completed Sets - read-only when skipped (no tap to edit) */}
      {exercise.sets.length > 0 && (
        <CompletedSetsPanel
          sets={exercise.sets}
          onSelectSet={!isSkipped && onSelectSet ? (setId, setIndex) => onSelectSet(exercise.id, setId, setIndex) : undefined}
          exerciseId={exercise.id}
          lastSetAt={exercise.lastSetAt}
          nowMs={nowMs}
        />
      )}

      {/* Last session chips - below inputs (only shown when no sets logged yet, hidden when skipped) */}
      {/* Visibility: ONLY show when exercise has 0 committed sets in current session */}
      {/* Data source: lastSessionData is strictly from previous completed sessions, never current session */}
      {!isSkipped && exercise.sets.length === 0 && lastSessionData && lastSessionData.sets && lastSessionData.sets.length > 0 && (() => {
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
            onLabelPress={() => setShowHistorySheet(true)}
            comparisonFlag={comparisonFlag?.show ? comparisonFlag.message : null}
            showChevron={false}
          />
        );
      })()}
    </div>

      {/* Exercise-level overflow bottom sheet (in group) */}
      {isInGroup && (!exercise.isComplete || isSkipped) && (
        <CompactBottomSheet
          isOpen={showExerciseOverflowSheet}
          onClose={() => setShowExerciseOverflowSheet(false)}
        >
          <OverflowActionGroup
            actions={[
              // Pair exercise only for standalone exercises; in-group use "Add to group" from group overflow
              ...(!isInGroup && onPairExercise ? [{
                label: 'Pair exercise',
                icon: Link2,
                onPress: () => {
                  onPairExercise();
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onSwapExercise && !isSkipped ? [{
                label: 'Swap exercise',
                icon: ArrowRightLeft,
                onPress: () => {
                  onSwapExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onRemoveFromGroup && !isSkipped ? [{
                label: 'Remove from group',
                icon: UserMinus,
                onPress: () => {
                  onRemoveFromGroup(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onDeferExercise && !isSkipped ? [{
                label: 'Defer to end',
                icon: ListEnd,
                onPress: () => {
                  onDeferExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(isSkipped && onUnskipExercise ? [{
                label: 'Unskip',
                icon: RotateCcw,
                onPress: () => {
                  onUnskipExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(!isSkipped && onSkipExercise ? [{
                label: 'Skip',
                icon: SkipForward,
                onPress: () => {
                  onSkipExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
              ...(onDeleteExercise ? [{
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onPress: () => {
                  onDeleteExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                },
              }] : []),
            ]}
          />
        </CompactBottomSheet>
      )}
      
      {/* Exercise history bottom sheet */}
      <ExerciseHistoryBottomSheet
        isOpen={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        exerciseName={exercise.name}
        sessions={historySessions}
        onChipPress={(chipWeightKg, chipReps) => {
          // Chip tap prefills draft inputs and closes sheet
          const displayWeight = convertKgToDisplay(chipWeightKg);
          onInputChange(exercise.id, displayWeight.toString(), chipReps.toString());
        }}
      />
    </>
  );
}
