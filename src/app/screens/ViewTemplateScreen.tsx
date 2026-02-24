import { useState, useEffect, useMemo } from 'react';
import { Play, GripVertical, Pencil, Trash2, X, Plus, Check, Link2Off } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';
import { ExerciseSearchScreen } from './ExerciseSearchScreen';
import { addExerciseToDb } from '../utils/exerciseDb';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { formatWeight } from '../../utils/weightFormat';
import {
  estimateWorkoutDuration,
  formatDurationRange,
  type EstimationExercise,
} from '../utils/duration';
import { ExerciseReorderAndGroupList } from '../../components/drag/ExerciseReorderAndGroupList';
import type { ExerciseItem, GroupItem, SessionListItem } from '../../components/drag/exerciseDnDUtils';
import {
  flattenToNames,
  findItemLocation,
  removeItem,
  replaceExerciseById,
  pullChildOutOfGroup,
  ungroup,
} from '../../components/drag/exerciseDnDUtils';
import { GroupLinkChip } from '../components/GroupLinkChip';
import { toast } from 'sonner';
import type { WorkoutNode } from '../types/templates';
import { namesToNodes } from '../utils/workoutNodes';
import { CTA_BREATHING_ROOM_PX } from '../constants/layout';

/** Compare items by structure and names (ignores IDs for dirty check). */
function itemsMatch(a: SessionListItem[], b: SessionListItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai.type !== bi.type) return false;
    if (ai.type === 'exercise' && bi.type === 'exercise') {
      if (ai.name !== bi.name) return false;
    } else if (ai.type === 'group' && bi.type === 'group') {
      if (ai.children.length !== bi.children.length) return false;
      for (let j = 0; j < ai.children.length; j++) {
        if (ai.children[j].name !== bi.children[j].name) return false;
      }
    }
  }
  return true;
}

function createExerciseItems(names: string[], templateId: string): ExerciseItem[] {
  return names.map((name, i) => ({ type: 'exercise' as const, id: `ex-${templateId}-${i}-${name}`, name }));
}

function templateToItems(template: WorkoutTemplate): SessionListItem[] {
  if (template.exerciseNodes && template.exerciseNodes.length > 0) {
    return template.exerciseNodes as SessionListItem[];
  }
  return createExerciseItems(template.exerciseNames || [], template.id || '');
}

/** Convert SessionListItem[] to EstimationExercise[] for duration estimation. */
function itemsToEstimationExercises(items: SessionListItem[]): EstimationExercise[] {
  const result: EstimationExercise[] = [];
  for (const item of items) {
    if (item.type === 'exercise') {
      result.push({ setCount: 3, groupId: null });
    } else {
      for (const _ of item.children) {
        result.push({ setCount: 3, groupId: item.id });
      }
    }
  }
  return result;
}

interface ViewTemplateScreenProps {
  template: WorkoutTemplate;
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  completedWorkouts?: Array<{ templateId?: string; durationSec?: number; endedAt?: number }>; // For duration estimation
  onBack: () => void;
  onStart: (editedItems: SessionListItem[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (name: string, items: SessionListItem[]) => void; // Optional: for saving edits
}

export function ViewTemplateScreen({
  template,
  lastSessionData,
  completedWorkouts = [],
  onBack,
  onStart,
  onEdit,
  onDelete,
  onSave,
}: ViewTemplateScreenProps) {
  // Defensive: Handle missing or invalid template
  if (!template) {
    if (import.meta.env.DEV) {
      console.error('[ViewTemplateScreen] Template prop is null or undefined');
    }
    return (
      <div className="flex flex-col h-full items-center justify-center p-5">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold">Workout not found</h2>
          <p className="text-text-muted">
            The workout data is missing or invalid.
          </p>
          <Button variant="primary" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Defensive: Ensure template has exercises (exerciseNames or exerciseNodes)
  const hasExerciseNames = Array.isArray(template.exerciseNames) && template.exerciseNames.length > 0;
  const hasExerciseNodes = Array.isArray(template.exerciseNodes) && template.exerciseNodes.length > 0;
  if (!hasExerciseNames && !hasExerciseNodes) {
    if (import.meta.env.DEV) {
      console.error('[ViewTemplateScreen] Template has no exercises:', template);
    }
    return (
      <div className="flex flex-col h-full items-center justify-center p-5">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold">Invalid workout data</h2>
          <p className="text-text-muted">
            The workout has no exercises. Add exercises to get started.
          </p>
          <Button variant="primary" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState<string>(template.name || '');
  const [editedItems, setEditedItems] = useState<SessionListItem[]>(() => templateToItems(template));
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showReplaceExercise, setShowReplaceExercise] = useState(false);
  const [replaceItem, setReplaceItem] = useState<ExerciseItem | null>(null);

  const originalItems = useMemo(() => templateToItems(template), [template?.id]);
  const isDirty = useMemo(() => {
    const nameChanged = editedName.trim() !== (template.name || '').trim();
    const itemsChanged = !itemsMatch(editedItems, originalItems);
    return nameChanged || itemsChanged;
  }, [editedName, editedItems, template.name, originalItems]);

  // Derive exercise names for consumers
  const editedExercises = useMemo(() => flattenToNames(editedItems), [editedItems]);

  // Reset edited values only when template changes (preserve edits when toggling edit mode)
  useEffect(() => {
    if (template) {
      setEditedName(template.name || '');
      setEditedItems(templateToItems(template));
    }
  }, [template?.id]);

  const handleConfirmChanges = () => {
    if (onSave) {
      onSave(editedName.trim(), editedItems);
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    if (template) {
      setEditedName(template.name || '');
      setEditedItems(templateToItems(template));
    }
    setIsEditMode(false);
  };

  const handleRemoveExercise = (item: ExerciseItem) => {
    const loc = findItemLocation(editedItems, item.id);
    if (!loc) return;
    const { nextItems } = removeItem(editedItems, loc);
    setEditedItems(nextItems);
  };

  const handleReplaceExercise = (item: ExerciseItem) => {
    setReplaceItem(item);
    setShowReplaceExercise(true);
  };

  const handleReplaceSelect = (exerciseName: string) => {
    if (replaceItem) {
      setEditedItems((prev) => replaceExerciseById(prev, replaceItem.id, { name: exerciseName }));
      setReplaceItem(null);
      setShowReplaceExercise(false);
    }
  };

  const handleUngroup = (group: GroupItem) => {
    setEditedItems((prev) => ungroup(prev, group.id));
  };

  const handleAddExercise = (exerciseName: string) => {
    const trimmedName = exerciseName.trim();
    if (trimmedName && !editedExercises.includes(trimmedName)) {
      try {
        addExerciseToDb(trimmedName);
      } catch (error) {
        // Exercise might already exist
      }
      setEditedItems((prev) => [
        ...prev,
        { type: 'exercise' as const, id: `ex-add-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: trimmedName },
      ]);
      setShowAddExercise(false);
    }
  };

  const handleAddNewExercise = (name: string) => {
    try {
      addExerciseToDb(name);
    } catch (error) {
      // Might already exist
    }
    handleAddExercise(name);
  };

  const handleStart = () => {
    onStart(editedItems);
  };

  // Estimate workout duration for preview (group-aware: groups = rounds with rest after each round)
  const itemsForEstimate = isEditMode ? editedItems : templateToItems(template);
  const estimationExercises = itemsToEstimationExercises(itemsForEstimate);
  const durationEstimate = estimateWorkoutDuration(
    template.id,
    estimationExercises,
    completedWorkouts
  );

  if (showAddExercise) {
    return (
      <ExerciseSearchScreen
        title="Add Exercise"
        onBack={() => setShowAddExercise(false)}
        onSelectExercise={handleAddExercise}
        onAddNewExercise={handleAddNewExercise}
        selectedExercises={editedExercises}
        placeholder="Search exercises..."
        autoFocus={true}
        showDetails={true}
        createButtonLabel="Create & add"
      />
    );
  }

  if (showReplaceExercise && replaceItem !== null) {
    return (
      <ExerciseSearchScreen
        title="Replace Exercise"
        onBack={() => {
          setShowReplaceExercise(false);
          setReplaceItem(null);
        }}
        onSelectExercise={handleReplaceSelect}
        onAddNewExercise={(name) => handleReplaceSelect(name)}
        selectedExercises={editedExercises}
        placeholder="Search exercises..."
        autoFocus={true}
        showDetails={true}
        createButtonLabel="Replace"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <TopBar
        title={isEditMode ? editedName : template.name}
        onBack={isEditMode ? handleCancel : onBack}
        rightAction={
          !isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text-primary"
            >
              <Pencil className="w-5 h-5" />
            </button>
          ) : isDirty ? (
            <button
              onClick={handleConfirmChanges}
              className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-accent"
              aria-label="Save changes"
            >
              <Check className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      <div
        className="flex-1 overflow-x-hidden overflow-y-auto min-w-0"
        style={
          !isEditMode
            ? { paddingBottom: `max(calc(8rem + env(safe-area-inset-bottom, 0px)), env(safe-area-inset-bottom, 0px))` }
            : undefined
        }
      >
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Workout name input (only in edit mode) */}
          {isEditMode && (
            <FloatingLabelInput
              label="Workout name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              autoFocus={false}
            />
          )}

          {/* Exercise list */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-text-muted px-1">
              Exercises ({isEditMode ? flattenToNames(editedItems).length : (template.exerciseNames?.length || 0)})
            </p>
            {isEditMode ? (
              <ExerciseReorderAndGroupList
                items={editedItems}
                onChange={setEditedItems}
                enableGrouping={true}
                renderExerciseRow={(item, { dragHandleProps, isDragging }) => (
                    <Card
                      gradient
                      className="cursor-pointer transition-shadow"
                      onClick={() => handleReplaceExercise(item)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div
                            {...dragHandleProps}
                            onClick={(e) => e.stopPropagation()}
                            className="touch-none"
                          >
                            <GripVertical className="w-5 h-5 text-text-muted" />
                          </div>
                          <span className="flex-1">{item.name}</span>
                          <button
                            data-no-drag
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveExercise(item);
                            }}
                            className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-surface/50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-text-muted">Tap to replace</div>
                      </div>
                    </Card>
                  )}
                renderGroupChild={(child, { dragHandleProps }) => (
                  <Card
                    gradient
                    className="cursor-pointer transition-shadow border-border-subtle"
                    onClick={() => handleReplaceExercise(child)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="touch-none">
                          <GripVertical className="w-5 h-5 text-text-muted" />
                        </div>
                        <span className="flex-1">{child.name}</span>
                        <button
                          data-no-drag
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExercise(child);
                          }}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-danger rounded-lg hover:bg-surface/50 transition-colors -m-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-text-muted">Tap to replace</div>
                    </div>
                  </Card>
                )}
                renderGroupRow={(group, { dragHandleProps }, { children }) => (
                    <Card gradient>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="touch-none">
                              <GripVertical className="w-5 h-5 text-text-muted" />
                            </div>
                            <GroupLinkChip childrenCount={group.children.length} />
                          </div>
                          <button
                            data-no-drag
                            onClick={(e) => {
                              e.stopPropagation();
                              const prev = editedItems;
                              handleUngroup(group);
                              toast('Ungrouped', {
                                action: {
                                  label: 'Undo',
                                  onClick: () => setEditedItems(prev),
                                },
                              });
                            }}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-surface/50 transition-colors -m-2"
                          >
                            <Link2Off className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          {children}
                        </div>
                      </div>
                    </Card>
                  )}
              />
            ) : (
              (() => {
                const items = templateToItems(template);
                return items.map((item) => {
                  if (item.type === 'exercise') {
                    const lastSession = lastSessionData?.get(item.name);
                    return (
                      <Card key={item.id} gradient>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="flex-1">{item.name}</span>
                          </div>
                          {lastSession && (
                            <div className="mt-2 text-text-muted">
                              <p className="text-xs mb-1">
                                Last session · {formatTimeAgo(lastSession.date)}
                              </p>
                              <div className="flex gap-3 flex-wrap">
                                {lastSession.sets
                                  .filter((set) => set && set.weight != null && set.reps != null)
                                  .map((set, i) => (
                                    <span key={i} className="text-xs">
                                      {formatWeight(set.weight)} × {set.reps}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  } else {
                    return (
                      <Card key={item.id} gradient>
                        <div className="space-y-2">
                          <GroupLinkChip childrenCount={item.children.length} />
                          <div className="mt-3 flex flex-col gap-2">
                            {item.children.map((c) => {
                              const lastSession = lastSessionData?.get(c.name);
                              return (
                                <Card key={c.id} gradient className="border-border-subtle">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <span className="flex-1">{c.name}</span>
                                    </div>
                                    {lastSession && (
                                      <div className="mt-2 text-text-muted">
                                        <p className="text-xs mb-1">
                                          Last session · {formatTimeAgo(lastSession.date)}
                                        </p>
                                        <div className="flex gap-3 flex-wrap">
                                          {lastSession.sets
                                            .filter((set) => set && set.weight != null && set.reps != null)
                                            .map((set, j) => (
                                              <span key={j} className="text-xs">
                                                {formatWeight(set.weight)} × {set.reps}
                                              </span>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    );
                  }
                });
              })()
            )}
            
            {/* Add exercise button in edit mode */}
            {isEditMode && (
              <div className="pt-4">
                <button
                  onClick={() => setShowAddExercise(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:border-accent transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add exercise</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit mode: actions area (Delete, Confirm) - scrolls with page */}
          {isEditMode && (
            <div
              className="pt-8 pb-6 space-y-4"
              style={{
                paddingBottom: `calc(${CTA_BREATHING_ROOM_PX}px + env(safe-area-inset-bottom, 0px))`,
              }}
            >
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Delete workout
              </Button>
              {isDirty && (
                <Button
                  variant="primary"
                  onClick={handleConfirmChanges}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2 inline" />
                  Save changes
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View mode only: Fixed Record workout bar */}
      {!isEditMode && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-panel border-t border-border-subtle px-5 pt-5 z-10"
          style={{
            paddingBottom: `max(calc(2.5rem + env(safe-area-inset-bottom, 0px)), env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <div className="max-w-2xl mx-auto space-y-2">
            {durationEstimate && (
              <p className="text-sm text-text-muted text-center">
                Estimated time: {formatDurationRange(durationEstimate.minSec, durationEstimate.maxSec)}
              </p>
            )}
            <Button variant="primary" onClick={handleStart} className="w-full">
              <Play className="w-4 h-4 mr-2 inline" />
              Record workout
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <Card className="max-w-sm w-full">
            <h3 className="mb-2">Delete workout?</h3>
            <p className="text-text-muted mb-6">
              This will permanently delete "{template.name}". This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="neutral"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}