import { useState, useEffect, useMemo } from 'react';
import { Check, Clock, X, MoreHorizontal, Link2 } from 'lucide-react';
import { Exercise, Set } from '../types';
import { ExerciseCardLogger } from './ExerciseCardLogger';
import { Button } from './Button';
import { formatWeight, convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';
import { getGroupExercises } from '../utils/exerciseGrouping';
import { CompactBottomSheet } from './CompactBottomSheet';
import { OverflowActionGroup } from './OverflowActionGroup';

interface SupersetBlockProps {
  groupId: string;
  exercises: Exercise[];
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  onAddSet: (exercises: Array<{ exerciseId: string; weight: number; reps: number }>, supersetSetId: string) => void;
  onCompleteGroup: (exerciseIds: string[]) => void;
  onDeleteSet?: (exerciseId: string, setId: string) => void;
  restTimerStart?: number | null;
  restTimerElapsed?: number;
  onRestTimerChange?: (restTimerStart: number | null) => void;
  // Group management props
  onAddToGroup?: () => void;
  // Exercise-level actions (passed to ExerciseCardLogger)
  onRemoveFromGroup?: (exerciseId: string) => void;
  onSwapExerciseInGroup?: (exerciseId: string) => void;
  onSkipExerciseInGroup?: (exerciseId: string) => void;
  onUpdateSet?: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onSelectSet?: (exerciseId: string, setId: string, setIndex: number) => void;
}

export function SupersetBlock({
  groupId,
  exercises,
  lastSessionData,
  onAddSet,
  onCompleteGroup,
  onDeleteSet,
  restTimerStart,
  restTimerElapsed = 0,
  onRestTimerChange,
  onAddToGroup,
  onRemoveFromGroup,
  onSwapExerciseInGroup,
  onSkipExerciseInGroup,
  onUpdateSet,
  onSelectSet,
}: SupersetBlockProps) {
  const groupMembers = useMemo(() => {
    const members = getGroupExercises(exercises, groupId);
    
    // Sort by position in exercises array (insertion order)
    return members.sort((a, b) => {
      const indexA = exercises.findIndex(ex => ex.id === a.id);
      const indexB = exercises.findIndex(ex => ex.id === b.id);
      return indexA - indexB;
    });
  }, [exercises, groupId]);

  // Input state for each exercise
  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string }>>({});

  // Initialize inputs
  useEffect(() => {
    const initial: Record<string, { weight: string; reps: string }> = {};
    groupMembers.forEach(ex => {
      if (!inputs[ex.id]) {
        // Prefill with last set if available
        // Weight is stored in kg (canonical), convert to display unit for input
        if (ex.sets.length > 0) {
          const lastSet = ex.sets[ex.sets.length - 1];
          const displayWeight = convertKgToDisplay(lastSet.weight);
          initial[ex.id] = {
            weight: displayWeight.toString(),
            reps: lastSet.reps.toString(),
          };
        } else {
          initial[ex.id] = { weight: '', reps: '' };
        }
      } else {
        initial[ex.id] = inputs[ex.id];
      }
    });
    if (Object.keys(initial).length > 0) {
      setInputs(prev => ({ ...prev, ...initial }));
    }
  }, [groupMembers.map(ex => ex.id).join(',')]);

  // Check if any exercise has sets
  const hasAnySets = groupMembers.some(ex => ex.sets.length > 0);

  // Check if all exercises are complete
  const allComplete = groupMembers.every(ex => ex.isComplete);

  // Bottom sheet state for group-level overflow
  const [showGroupOverflowSheet, setShowGroupOverflowSheet] = useState(false);

  const handleInputChange = (exerciseId: string, weight: string, reps: string) => {
    setInputs(prev => ({
      ...prev,
      [exerciseId]: { weight, reps },
    }));
  };

  const handleAddSet = () => {
    // Generate shared supersetSetId
    const supersetSetId = `superset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Collect exercises with valid input
    const exercisesToLog: Array<{ exerciseId: string; weight: number; reps: number }> = [];
    
    groupMembers.forEach(ex => {
      const input = inputs[ex.id];
      if (input) {
        const wDisplay = parseFloat(input.weight);
        const r = parseInt(input.reps);
        // Allow 0 as valid input (for bodyweight exercises, planks, etc.)
        if (!isNaN(wDisplay) && wDisplay >= 0 && !isNaN(r) && r >= 0) {
          // Convert from display unit to kg (canonical) for storage
          const wKg = convertDisplayToKg(wDisplay);
          exercisesToLog.push({
            exerciseId: ex.id,
            weight: wKg,
            reps: r,
          });
        }
      }
    });

    // Only log if at least one exercise has valid input
    if (exercisesToLog.length > 0) {
      onAddSet(exercisesToLog, supersetSetId);
      
      // Clear inputs only for exercises that were logged
      const updatedInputs = { ...inputs };
      exercisesToLog.forEach(({ exerciseId }) => {
        // Keep the values for next set (prefill)
        const input = inputs[exerciseId];
        if (input) {
          updatedInputs[exerciseId] = {
            weight: input.weight,
            reps: input.reps,
          };
        }
      });
      setInputs(updatedInputs);
      
      // Start rest timer
      if (onRestTimerChange) {
        onRestTimerChange(Date.now());
      }
    }
  };

  const handleComplete = () => {
    onCompleteGroup(groupMembers.map(ex => ex.id));
  };

  // Rest timer display
  const showRestTimer = restTimerStart !== null && restTimerStart !== undefined && hasAnySets;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {/* Group indicator pill - muted blue, non-interactive */}
          <span 
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent/70 border border-accent/20 text-xs"
            aria-label="Grouped exercises"
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            <span className="uppercase">Group</span>
          </span>
          {!allComplete && onAddToGroup && (
            <button 
              onClick={() => setShowGroupOverflowSheet(true)}
              className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface/50"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="space-y-3">
        {groupMembers.map((exercise, index) => (
          <div
            key={exercise.id}
            className="relative flex items-center gap-2"
          >
            <div className="flex-1">
              <ExerciseCardLogger
                exercise={exercise}
                lastSessionData={lastSessionData.get(exercise.name) || null}
                onInputChange={handleInputChange}
                weight={inputs[exercise.id]?.weight || ''}
                reps={inputs[exercise.id]?.reps || ''}
                showRemove={false}
                isInGroup={true}
                onRemoveFromGroup={onRemoveFromGroup}
                onSwapExercise={onSwapExerciseInGroup}
                onSkipExercise={onSkipExerciseInGroup}
                onDeleteSet={onDeleteSet}
                onUpdateSet={onUpdateSet}
                onSelectSet={onSelectSet}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="primary"
          onClick={handleAddSet}
          className="flex-1"
        >
          Log Set
        </Button>
        {hasAnySets && (
          allComplete ? (
            // Muted "Done" state for completed groups
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted bg-surface/50 rounded-lg border border-border-subtle">
              <Check className="w-4 h-4" />
              <span>Done</span>
            </div>
          ) : (
            // Active "Done" button for incomplete groups
            <Button
              variant="neutral"
              onClick={handleComplete}
            >
              <Check className="w-4 h-4 mr-2 inline" />
              Done
            </Button>
          )
        )}
      </div>

      {/* Since last set timer - below Add set/Done buttons for grouped exercises */}
      {showRestTimer && (
        <div className="flex items-center justify-between px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-text-muted" />
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Since last set</p>
              <p className="text-lg tabular-nums">
                {Math.floor(restTimerElapsed / 60)}:{(restTimerElapsed % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          {onRestTimerChange && (
            <button
              onClick={() => onRestTimerChange(null)}
              className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Group-level overflow bottom sheet */}
      {onAddToGroup && (
        <CompactBottomSheet
          isOpen={showGroupOverflowSheet}
          onClose={() => setShowGroupOverflowSheet(false)}
        >
          <OverflowActionGroup
            actions={[
              {
                label: 'Add to group',
                icon: Link2,
                onPress: () => {
                  onAddToGroup();
                  setShowGroupOverflowSheet(false);
                },
              },
            ]}
          />
        </CompactBottomSheet>
      )}
    </div>
  );
}
