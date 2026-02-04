import { useState, useMemo } from 'react';
import { Play, Trash2, Check, X, Edit2, MoreHorizontal, Save, Link2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { CompactBottomSheet } from '../components/CompactBottomSheet';
import { OverflowActionGroup } from '../components/OverflowActionGroup';
import { Workout } from '../types';
import { formatDate } from '../utils/storage';
import { formatWeight } from '../../utils/weightFormat';
import { buildSessionItems } from '../utils/exerciseGrouping';
import { formatDuration, getElapsedSec } from '../utils/duration';
import { getSetsInDisplayOrder } from '../utils/setOrdering';

interface WorkoutSummaryScreenProps {
  workout: Workout;
  isJustCompleted?: boolean;
  isSingleExercise?: boolean;
  isFromHistory?: boolean; // True when viewing from history (read-only mode)
  onBack: () => void;
  onFinalize?: () => void; // Called when Done is tapped on just-completed workout
  onStartAgain?: () => void;
  onAddAnother?: () => void;
  onEditExercise?: (exerciseId: string) => void;
  onViewExerciseHistory?: (exerciseName: string) => void;
  onDelete?: () => void;
  onUpdateName?: (workoutId: string, newName: string) => void;
  onSaveWorkout?: (workoutId: string, name: string) => void; // Save workout as template
}

export function WorkoutSummaryScreen({
  workout,
  isJustCompleted = false,
  isSingleExercise = false,
  isFromHistory = false,
  onBack,
  onFinalize,
  onStartAgain,
  onAddAnother,
  onEditExercise,
  onViewExerciseHistory,
  onDelete,
  onUpdateName,
  onSaveWorkout,
}: WorkoutSummaryScreenProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workout.name);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showSaveWorkoutSheet, setShowSaveWorkoutSheet] = useState(false);
  const [saveWorkoutName, setSaveWorkoutName] = useState(workout.name);

  // Build session items to group exercises
  const sessionItems = useMemo(() => buildSessionItems(workout.exercises), [workout.exercises]);

  const durationSec =
    typeof workout.durationSec === 'number'
      ? workout.durationSec
      : getElapsedSec(workout.startedAt || workout.startTime, workout.endedAt || workout.endTime);

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteModal(false);
    }
  };

  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(workout.name);
  };

  const handleSaveName = () => {
    if (onUpdateName && editedName.trim() && editedName.trim() !== workout.name) {
      onUpdateName(workout.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setEditedName(workout.name);
    setIsEditingName(false);
  };

  const handleSaveWorkout = () => {
    if (onSaveWorkout && saveWorkoutName.trim()) {
      onSaveWorkout(workout.id, saveWorkoutName.trim());
      setShowSaveWorkoutSheet(false);
      setShowOverflowMenu(false);
    }
  };

  const handleOpenSaveWorkout = () => {
    setSaveWorkoutName(workout.name);
    setShowOverflowMenu(false);
    setShowSaveWorkoutSheet(true);
  };

  const handleOpenDelete = () => {
    setShowOverflowMenu(false);
    setShowDeleteModal(true);
  };

  // Determine if edit button should be shown (only for single exercises that are NOT from history)
  const shouldShowEditButton = onEditExercise && isSingleExercise && !isFromHistory;
  
  // Determine if overflow menu should be shown:
  // - History Summary (multi-exercise)
  // - Just-finished Summary (multi-exercise)
  // Never show for single-exercise summaries.
  const shouldShowOverflowMenu =
    (isFromHistory || isJustCompleted) && !isSingleExercise && workout.exercises.length >= 2;

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Summary" 
        onBack={onBack}
        rightAction={
          shouldShowOverflowMenu ? (
            <button
              onClick={() => setShowOverflowMenu(true)}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text-primary"
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          ) : onDelete ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-danger"
              aria-label="Delete entry"
              title="Delete entry"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-5 space-y-6">
          {/* Workout info */}
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                    } else if (e.key === 'Escape') {
                      handleCancelEditName();
                    }
                  }}
                  className="flex-1 text-2xl font-semibold bg-transparent border-b-2 border-accent focus:outline-none focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                  aria-label="Save name"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEditName}
                  className="p-1.5 text-text-muted hover:bg-surface rounded-lg transition-colors"
                  aria-label="Cancel editing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <h2 
                className="text-2xl cursor-pointer hover:text-accent transition-colors mb-2"
                onClick={handleStartEditName}
                title="Tap to edit name"
              >
                {workout.name}
              </h2>
            )}
            <p className="text-text-muted">
              {formatDate(workout.endTime || workout.startTime)} · {sessionItems.length} {sessionItems.length === 1 ? 'item' : 'items'} · Total time {formatDuration(durationSec)}
            </p>
          </div>

          {/* Exercise breakdown - grouped */}
          <div className="space-y-4">
            {sessionItems.map((item) => {
              const itemExercises = workout.exercises.filter(ex => item.exerciseIds.includes(ex.id));
              
              if (item.type === 'superset') {
                // Render grouped exercises as a group card
                return (
                  <Card key={item.id} gradient>
                    <div className="mb-4">
                      {/* Group indicator pill - muted blue, matches active session styling */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent/70 border border-accent/20 text-xs mb-3"
                        aria-label="Grouped exercises"
                      >
                        <Link2 className="w-3 h-3" aria-hidden="true" />
                        <span className="uppercase">Group</span>
                      </span>
                      <div className="space-y-4">
                        {itemExercises.map((exercise) => {
                          const totalVolume = exercise.sets.reduce((sum, set) => {
                            const weight = set.weight ?? 0;
                            const reps = set.reps ?? 0;
                            return sum + (weight * reps);
                          }, 0);
                          const avgWeight = exercise.sets.length > 0
                            ? exercise.sets.reduce((sum, set) => sum + (set.weight ?? 0), 0) / exercise.sets.length
                            : 0;

                          return (
                            <div key={exercise.id} className="border-b border-border-subtle last:border-b-0 pb-4 last:pb-0">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-medium text-text-primary">{exercise.name}</h4>
                              </div>

                              {/* Sets */}
                              <div className="space-y-2 mb-3">
                                {(() => {
                                  const sortedSets = getSetsInDisplayOrder(exercise.sets);
                                  return sortedSets.map((set, index) => (
                                  <div
                                    key={set.id}
                                    className="flex items-center justify-between p-2 bg-surface rounded-lg"
                                  >
                                    <span className="text-text-muted text-sm">Set {index + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{formatWeight(set.weight)}</span>
                                      <span className="text-text-muted">×</span>
                                      <span className="text-sm">{set.reps} reps</span>
                                    </div>
                                  </div>
                                  ));
                                })()}
                              </div>

                              {/* Stats */}
                              <div className="flex gap-4 text-text-muted">
                                <div>
                                  <span className="text-xs uppercase tracking-wide">Total Volume</span>
                                  <p className="text-text-primary text-sm">{formatWeight(totalVolume, 0)}</p>
                                </div>
                                <div>
                                  <span className="text-xs uppercase tracking-wide">Avg Weight</span>
                                  <p className="text-text-primary text-sm">{formatWeight(avgWeight)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              } else {
                // Render individual exercise
                const exercise = itemExercises[0];
                if (!exercise) return null;

                const totalVolume = exercise.sets.reduce((sum, set) => {
                  const weight = set.weight ?? 0;
                  const reps = set.reps ?? 0;
                  return sum + (weight * reps);
                }, 0);
                const avgWeight = exercise.sets.length > 0
                  ? exercise.sets.reduce((sum, set) => sum + (set.weight ?? 0), 0) / exercise.sets.length
                  : 0;

                return (
                  <Card 
                    key={exercise.id} 
                    gradient
                    onClick={onViewExerciseHistory ? () => onViewExerciseHistory(exercise.name) : undefined}
                    className={onViewExerciseHistory ? "cursor-pointer" : ""}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="flex-1">{exercise.name}</h3>
                      {shouldShowEditButton && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditExercise(exercise.id);
                          }}
                          className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-surface"
                          title="Edit exercise"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sets */}
                    <div className="space-y-2 mb-4">
                      {(() => {
                        const sortedSets = getSetsInDisplayOrder(exercise.sets);
                        return sortedSets.map((set, index) => (
                        <div
                          key={set.id}
                          className="flex items-center justify-between p-3 bg-surface rounded-lg"
                        >
                          <span className="text-text-muted">Set {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatWeight(set.weight)}</span>
                            <span className="text-text-muted">×</span>
                            <span>{set.reps} reps</span>
                          </div>
                        </div>
                        ));
                      })()}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 mb-4 text-text-muted">
                      <div>
                        <span className="text-xs uppercase tracking-wide">Total Volume</span>
                        <p className="text-text-primary">{formatWeight(totalVolume, 0)}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide">Avg Weight</span>
                        <p className="text-text-primary">{formatWeight(avgWeight)}</p>
                      </div>
                    </div>

                  </Card>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Fixed Actions */}
      {(!isJustCompleted && onStartAgain) || isJustCompleted ? (
        <div className="fixed bottom-0 left-0 right-0 bg-panel border-t border-border-subtle p-5 z-10">
          <div className="max-w-2xl mx-auto">
            {!isJustCompleted && onStartAgain && (
              <Button variant="primary" onClick={onStartAgain} className="w-full">
                <Play className="w-4 h-4 mr-2 inline" />
                {isSingleExercise ? 'Repeat exercise' : 'Repeat workout'}
              </Button>
            )}
            {isJustCompleted && (
              <Button 
                variant="neutral" 
                onClick={() => {
                  if (onFinalize) {
                    onFinalize();
                  } else {
                    onBack();
                  }
                }} 
                className="w-full"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* Overflow Menu Bottom Sheet */}
      <CompactBottomSheet
        isOpen={showOverflowMenu}
        onClose={() => setShowOverflowMenu(false)}
      >
        <OverflowActionGroup
          actions={[
            {
              label: 'Save workout',
              icon: Save,
              onPress: handleOpenSaveWorkout,
            },
            {
              label: 'Delete',
              icon: Trash2,
              onPress: handleOpenDelete,
              destructive: true,
            },
          ]}
        />
      </CompactBottomSheet>

      {/* Save Workout Bottom Sheet */}
      <CompactBottomSheet
        isOpen={showSaveWorkoutSheet}
        onClose={() => {
          setShowSaveWorkoutSheet(false);
          setSaveWorkoutName(workout.name);
        }}
        title="Save workout"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Workout name
            </label>
            <input
              type="text"
              value={saveWorkoutName}
              onChange={(e) => setSaveWorkoutName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveWorkoutName.trim()) {
                  handleSaveWorkout();
                }
              }}
              className="w-full px-4 py-3 bg-surface border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Enter workout name"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="neutral"
              onClick={() => {
                setShowSaveWorkoutSheet(false);
                setSaveWorkoutName(workout.name);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveWorkout}
              disabled={!saveWorkoutName.trim()}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </CompactBottomSheet>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete entry?"
        actions={
          <>
            <Button variant="neutral" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </>
        }
      >
        <p className="text-text-muted">
          This will permanently delete this record.
        </p>
      </Modal>
    </div>
  );
}