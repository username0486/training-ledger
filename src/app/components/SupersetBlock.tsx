import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Check, Clock, X, MoreHorizontal, Link2, Unlink, ListEnd, SkipForward, Trash2 } from 'lucide-react';
import { Exercise, Set, Workout } from '../types';
import { ExerciseCardLogger } from './ExerciseCardLogger';
import { Button } from './Button';
import { formatWeight, convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';
import { getGroupExercises } from '../utils/exerciseGrouping';
import { CompactBottomSheet } from './CompactBottomSheet';
import { OverflowActionGroup } from './OverflowActionGroup';
import { formatRestTime, getGroupLastSetAt } from '../utils/restTimer';

interface SupersetBlockProps {
  groupId: string;
  exercises: Exercise[];
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  allWorkouts?: Workout[]; // All workouts for history and comparison
  onAddSet: (exercises: Array<{ exerciseId: string; weight: number; reps: number }>, supersetSetId: string) => void;
  onCompleteGroup: (exerciseIds: string[]) => void;
  onDeleteSet?: (exerciseId: string, setId: string) => void;
  restOwnerId?: string | null; // groupId if this group owns the rest timer
  restElapsed?: number; // computed elapsed time in seconds
  onRestTimerChange?: (ownerId: string | null, timestamp?: number) => void;
  nowMs?: number; // current timestamp for consistent elapsed time computation
  // Group management props
  onAddToGroup?: () => void;
  // Exercise-level actions (passed to ExerciseCardLogger)
  onRemoveFromGroup?: (exerciseId: string) => void;
  onSwapExerciseInGroup?: (exerciseId: string) => void;
  onSkipExerciseInGroup?: (exerciseId: string) => void;
  onUnskipExerciseInGroup?: (exerciseId: string) => void;
  onDeferExerciseInGroup?: (exerciseId: string) => void;
  onDeleteExerciseInGroup?: (exerciseId: string) => void;
  onUpdateSet?: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onSelectSet?: (exerciseId: string, setId: string, setIndex: number) => void;
  // Shared input state for persistence across navigation
  exerciseInputs?: Map<string, { weight: string; reps: string }>;
  onInputChange?: (exerciseId: string, weight: string, reps: string) => void;
  // Group-level actions
  onSkipGroup?: (exerciseIds: string[]) => void;
  onDeferGroup?: (exerciseIds: string[]) => void;
  onDeleteGroup?: (exerciseIds: string[]) => void;
  onUngroupGroup?: (groupId: string) => void;
}

export function SupersetBlock({
  groupId,
  exercises,
  lastSessionData,
  allWorkouts = [],
  onAddSet,
  onCompleteGroup,
  onDeleteSet,
  restOwnerId,
  restElapsed = 0,
  onRestTimerChange,
  nowMs = Date.now(),
  onAddToGroup,
  onRemoveFromGroup,
  onSwapExerciseInGroup,
  onSkipExerciseInGroup,
  onUnskipExerciseInGroup,
  onDeferExerciseInGroup,
  onDeleteExerciseInGroup,
  onUpdateSet,
  onSelectSet,
  exerciseInputs,
  onInputChange: onInputChangeProp,
  onSkipGroup,
  onDeferGroup,
  onDeleteGroup,
  onUngroupGroup,
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

  // Use shared input state if provided, otherwise fall back to local state
  const [localInputs, setLocalInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  const inputs = exerciseInputs 
    ? Object.fromEntries(
        groupMembers.map(ex => {
          const saved = exerciseInputs.get(ex.id);
          return [ex.id, saved || { weight: '', reps: '' }];
        })
      )
    : localInputs;

  // Initialize inputs from saved state or last set (only if using local state)
  useEffect(() => {
    if (exerciseInputs && onInputChangeProp) {
      // Using shared state - initialize any missing exercises from last set
      groupMembers.forEach(ex => {
        const saved = exerciseInputs.get(ex.id);
        if (!saved || (saved.weight === '' && saved.reps === '')) {
          // No saved input - prefill from last set if available
          if (ex.sets.length > 0) {
            const lastSet = ex.sets[ex.sets.length - 1];
            const displayWeight = convertKgToDisplay(lastSet.weight);
            onInputChangeProp(ex.id, displayWeight.toString(), lastSet.reps.toString());
          }
        }
      });
      return;
    }

    // Using local state - initialize from last set
    const initial: Record<string, { weight: string; reps: string }> = {};
    groupMembers.forEach(ex => {
      if (!localInputs[ex.id]) {
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
        initial[ex.id] = localInputs[ex.id];
      }
    });
    if (Object.keys(initial).length > 0) {
      setLocalInputs(prev => ({ ...prev, ...initial }));
    }
  }, [groupMembers.map(ex => ex.id).join(','), exerciseInputs, onInputChangeProp]);

  // Check if any exercise has sets
  const hasAnySets = groupMembers.some(ex => ex.sets.length > 0);

  // Check if all exercises are complete (skipped counts as done for group completion)
  const allComplete = groupMembers.every(ex => ex.isComplete || ex.isSkipped);

  // Only non-skipped exercises participate in group logging
  const activeMembers = useMemo(() => groupMembers.filter(ex => !ex.isSkipped), [groupMembers]);
  const allSkipped = activeMembers.length === 0;

  // Bottom sheet state for group-level overflow
  const [showGroupOverflowSheet, setShowGroupOverflowSheet] = useState(false);
  // Delete group confirmation
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);

  const handleInputChange = (exerciseId: string, weight: string, reps: string) => {
    if (onInputChangeProp) {
      // Use shared state handler
      onInputChangeProp(exerciseId, weight, reps);
    } else {
      // Fall back to local state
      setLocalInputs(prev => ({
        ...prev,
        [exerciseId]: { weight, reps },
      }));
    }
  };

  const handleAddSet = () => {
    if (allSkipped) {
      toast('All exercises in this group are skipped.');
      return;
    }

    // Generate shared supersetSetId
    const supersetSetId = `superset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Collect exercises with valid input (only from non-skipped)
    const exercisesToLog: Array<{ exerciseId: string; weight: number; reps: number }> = [];
    
    activeMembers.forEach(ex => {
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
      // Capture timestamp before logging (will be used by parent to update rest timer)
      const setTimestamp = Date.now();
      onAddSet(exercisesToLog, supersetSetId);
      
      // Inputs are preserved automatically (already in shared state or local state)
      // No need to update here - values persist for next set
      
      // Update rest context: this group now owns the rest timer
      // Pass the timestamp so parent can set restStartedAtMs immediately (before exercises update)
      if (onRestTimerChange) {
        onRestTimerChange(groupId, setTimestamp);
      }
    }
  };

  const handleComplete = () => {
    // Clear rest context if this group owns it
    if (restOwnerId === groupId && onRestTimerChange) {
      onRestTimerChange(null);
    }
    onCompleteGroup(groupMembers.map(ex => ex.id));
  };

  // Rest timer display - show if this group owns the rest context, is not completed, and has sets
  const showRestTimer = restOwnerId === groupId && !allComplete && hasAnySets;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle px-4 py-4 space-y-3">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {/* Group indicator pill - muted blue, non-interactive */}
          <span 
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent/70 border border-accent/20 text-xs"
            aria-label={`${groupMembers.length} exercises in group`}
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            <span className="uppercase">{groupMembers.length} {groupMembers.length === 1 ? 'exercise' : 'exercises'}</span>
          </span>
          {(onAddToGroup || onUngroupGroup || onDeferGroup || onSkipGroup || onDeleteGroup) && (
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
                allWorkouts={allWorkouts}
                onInputChange={handleInputChange}
                weight={inputs[exercise.id]?.weight || ''}
                reps={inputs[exercise.id]?.reps || ''}
                showRemove={false}
                isInGroup={true}
                onRemoveFromGroup={onRemoveFromGroup}
                onSwapExercise={onSwapExerciseInGroup}
                onSkipExercise={onSkipExerciseInGroup}
                onUnskipExercise={onUnskipExerciseInGroup}
                onDeferExercise={onDeferExerciseInGroup}
                onDeleteExercise={onDeleteExerciseInGroup}
                onPairExercise={() => {
                  if (onAddToGroup) {
                    onAddToGroup();
                  }
                }}
                onDeleteSet={onDeleteSet}
                onUpdateSet={onUpdateSet}
                onSelectSet={onSelectSet}
                nowMs={nowMs}
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
          disabled={allSkipped}
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
                {formatRestTime(restElapsed)}
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
      {(onAddToGroup || onUngroupGroup || onDeferGroup || onSkipGroup || onDeleteGroup) && (
        <CompactBottomSheet
          isOpen={showGroupOverflowSheet}
          onClose={() => setShowGroupOverflowSheet(false)}
        >
          <OverflowActionGroup
            actions={[
              ...(onAddToGroup ? [{
                label: 'Add to group',
                icon: Link2,
                onPress: () => {
                  onAddToGroup();
                  setShowGroupOverflowSheet(false);
                },
              }] : []),
              ...(onUngroupGroup ? [{
                label: 'Ungroup exercises',
                icon: Unlink,
                onPress: () => {
                  onUngroupGroup(groupId);
                  setShowGroupOverflowSheet(false);
                },
              }] : []),
              ...(onDeferGroup ? [{
                label: 'Defer to end',
                icon: ListEnd,
                onPress: () => {
                  onDeferGroup(groupMembers.map(ex => ex.id));
                  setShowGroupOverflowSheet(false);
                },
              }] : []),
              ...(onSkipGroup ? [{
                label: 'Skip',
                icon: SkipForward,
                onPress: () => {
                  onSkipGroup(groupMembers.map(ex => ex.id));
                  setShowGroupOverflowSheet(false);
                },
              }] : []),
              ...(onDeleteGroup ? [{
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onPress: () => {
                  setShowGroupOverflowSheet(false);
                  setShowDeleteGroupConfirm(true);
                },
              }] : []),
            ]}
          />
        </CompactBottomSheet>
      )}

      {/* Delete group confirmation modal */}
      {onDeleteGroup && (
        <CompactBottomSheet
          isOpen={showDeleteGroupConfirm}
          onClose={() => setShowDeleteGroupConfirm(false)}
          title="Delete this group?"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              This will remove the group and all {groupMembers.length} exercise{groupMembers.length !== 1 ? 's' : ''} from this session. Logged sets will be deleted. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                onClick={() => setShowDeleteGroupConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDeleteGroup(groupMembers.map(ex => ex.id));
                  setShowDeleteGroupConfirm(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </CompactBottomSheet>
      )}
    </div>
  );
}
