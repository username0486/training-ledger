import { useState, useEffect } from 'react';
import { Play, GripVertical, Pencil, Trash2, X, Plus, Check } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';
import { ExerciseSearchScreen } from './ExerciseSearchScreen';
import { addExerciseToDb } from '../utils/exerciseDb';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Dumbbell } from 'lucide-react';
import { formatWeight } from '../../utils/weightFormat';
import { estimateWorkoutDuration, formatDurationRange } from '../utils/duration';

interface ViewTemplateScreenProps {
  template: WorkoutTemplate;
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  completedWorkouts?: Array<{ templateId?: string; durationSec?: number; endedAt?: number }>; // For duration estimation
  onBack: () => void;
  onStart: (editedExerciseNames: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (name: string, exercises: string[]) => void; // Optional: for saving edits
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

  // Defensive: Ensure template has required properties
  if (!template.exerciseNames || !Array.isArray(template.exerciseNames)) {
    if (import.meta.env.DEV) {
      console.error('[ViewTemplateScreen] Template has invalid exerciseNames:', template);
    }
    return (
      <div className="flex flex-col h-full items-center justify-center p-5">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold">Invalid workout data</h2>
          <p className="text-text-muted">
            The workout exercises data is invalid or corrupted.
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
  const [editedExercises, setEditedExercises] = useState<string[]>(template.exerciseNames || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [isDraggingFromHandle, setIsDraggingFromHandle] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showReplaceExercise, setShowReplaceExercise] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Reset edited values only when template changes (preserve edits when toggling edit mode)
  useEffect(() => {
    if (template) {
      setEditedName(template.name || '');
      setEditedExercises([...(template.exerciseNames || [])]);
    }
  }, [template?.id]);

  const handleDone = () => {
    // Save changes if onSave callback is provided
    if (onSave) {
      onSave(editedName.trim(), editedExercises);
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    if (template) {
      setEditedName(template.name || '');
      setEditedExercises([...(template.exerciseNames || [])]);
    }
    setIsEditMode(false);
  };

  const handleRemoveExercise = (index: number) => {
    setEditedExercises(editedExercises.filter((_, i) => i !== index));
  };

  const handleReplaceExercise = (index: number) => {
    setReplaceIndex(index);
    setShowReplaceExercise(true);
  };

  const handleReplaceSelect = (exerciseName: string) => {
    if (replaceIndex !== null) {
      const newExercises = [...editedExercises];
      newExercises[replaceIndex] = exerciseName;
      setEditedExercises(newExercises);
      setReplaceIndex(null);
      setShowReplaceExercise(false);
    }
  };

  const handleAddExercise = (exerciseName: string) => {
    const trimmedName = exerciseName.trim();
    if (trimmedName && !editedExercises.includes(trimmedName)) {
      try {
        addExerciseToDb(trimmedName);
      } catch (error) {
        // Exercise might already exist
      }
      setEditedExercises([...editedExercises, trimmedName]);
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newExercises = [...editedExercises];
    const draggedItem = newExercises[draggedIndex];
    newExercises.splice(draggedIndex, 1);
    newExercises.splice(index, 0, draggedItem);
    
    setEditedExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch/pointer handlers for mobile drag (only used in edit mode)
  const handleHandleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartIndex(index);
    setDraggedIndex(index);
    setIsDraggingFromHandle(true);
  };

  const handleHandlePointerDown = (e: React.PointerEvent, index: number) => {
    if (!isEditMode) return;
    // Prevent text selection on mobile
    e.preventDefault();
    e.stopPropagation();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setTouchStartY(e.clientY);
      setTouchStartIndex(index);
      setDraggedIndex(index);
      setIsDraggingFromHandle(true);
    }
  };

  const handleRowTouchMove = (e: React.TouchEvent, index: number) => {
    if (!isEditMode || !isDraggingFromHandle || touchStartY === null || touchStartIndex === null) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;

    // Only reorder if moved significantly (more than 20px)
    if (Math.abs(deltaY) > 20) {
      const newExercises = [...editedExercises];
      const draggedItem = newExercises[touchStartIndex];
      
      // Calculate target index based on movement
      const rowHeight = 60; // Approximate row height
      const targetOffset = Math.round(deltaY / rowHeight);
      let targetIndex = touchStartIndex + targetOffset;
      targetIndex = Math.max(0, Math.min(targetIndex, newExercises.length - 1));

      if (targetIndex !== touchStartIndex) {
        newExercises.splice(touchStartIndex, 1);
        newExercises.splice(targetIndex, 0, draggedItem);
        setEditedExercises(newExercises);
        setTouchStartIndex(targetIndex);
        setDraggedIndex(targetIndex);
      }
    }
  };

  const handleRowTouchEnd = (e: React.TouchEvent) => {
    if (!isEditMode || !isDraggingFromHandle) return;
    e.preventDefault();
    e.stopPropagation();
    setTouchStartY(null);
    setTouchStartIndex(null);
    setDraggedIndex(null);
    setIsDraggingFromHandle(false);
  };

  const handleStart = () => {
    // Always use editedExercises (which may have been modified in edit mode)
    // If never edited, editedExercises equals template.exerciseNames
    onStart(editedExercises);
  };

  // Estimate workout duration for preview
  const exerciseCount = isEditMode ? editedExercises.length : (template.exerciseNames?.length || 0);
  const durationEstimate = estimateWorkoutDuration(template.id, exerciseCount, completedWorkouts);

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

  if (showReplaceExercise && replaceIndex !== null) {
    return (
      <ExerciseSearchScreen
        title="Replace Exercise"
        onBack={() => {
          setShowReplaceExercise(false);
          setReplaceIndex(null);
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
          <div className="flex items-center gap-1">
            {isEditMode ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-danger"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDone}
                  className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-accent"
                >
                  <Check className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text-primary"
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Workout name input (only in edit mode) */}
          {isEditMode && (
            <FloatingLabelInput
              label="Workout name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              autoFocus={false}
              icon={<Dumbbell />}
            />
          )}

          {/* Exercise list */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-text-muted px-1">
              Exercises ({isEditMode ? editedExercises.length : (template.exerciseNames?.length || 0)})
            </p>
            {(isEditMode ? editedExercises : (template.exerciseNames || [])).map((exercise, index) => {
              if (!exercise) {
                if (import.meta.env.DEV) {
                  console.warn('[ViewTemplateScreen] Empty exercise at index:', index);
                }
                return null;
              }
              const lastSession = lastSessionData?.get(exercise);
              return (
                <Card
                  key={`${exercise}-${index}`} 
                  gradient
                  className={isEditMode ? 'cursor-pointer' : ''}
                  onClick={isEditMode ? () => handleReplaceExercise(index) : undefined}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {isEditMode && (
                        <div
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleHandleTouchStart(e, index)}
                          onPointerDown={(e) => handleHandlePointerDown(e, index)}
                          className="cursor-grab active:cursor-grabbing drag-handle"
                          style={{
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none',
                            touchAction: 'none',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-5 h-5 text-text-muted" />
                        </div>
                      )}
                      <span className="text-text-muted w-6">#{index + 1}</span>
                      <span className="flex-1">{exercise}</span>
                      {isEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExercise(index);
                          }}
                          className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-surface/50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {!isEditMode && lastSession && (
                      <div className="ml-9 text-text-muted">
                        <p className="text-xs mb-1">
                          Last session · {formatTimeAgo(lastSession.date)}
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {lastSession.sets
                            .filter(set => set && set.weight != null && set.reps != null)
                            .map((set, idx) => (
                              <span key={idx} className="text-xs">
                                {formatWeight(set.weight)} × {set.reps}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="ml-9 text-xs text-text-muted">
                        Tap to replace
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
            
            {/* Add exercise button in edit mode */}
            {isEditMode && (
              <button
                onClick={() => setShowAddExercise(true)}
                className="w-full py-3 px-4 border-2 border-dashed border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:border-accent transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add exercise</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Record workout button */}
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
          <Button
            variant="primary"
            onClick={handleStart}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2 inline" />
            Record workout
          </Button>
        </div>
      </div>

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