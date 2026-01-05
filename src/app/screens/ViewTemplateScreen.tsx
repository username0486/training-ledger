import { useState, useEffect } from 'react';
import { Play, GripVertical, Pencil, Trash2, X, Plus, Check } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { addExerciseToDb } from '../utils/exerciseDb';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Dumbbell } from 'lucide-react';

interface ViewTemplateScreenProps {
  template: WorkoutTemplate;
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  onBack: () => void;
  onStart: (editedExerciseNames: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (name: string, exercises: string[]) => void; // Optional: for saving edits
}

export function ViewTemplateScreen({
  template,
  lastSessionData,
  onBack,
  onStart,
  onEdit,
  onDelete,
  onSave,
}: ViewTemplateScreenProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState<string>(template.name);
  const [editedExercises, setEditedExercises] = useState<string[]>(template.exerciseNames);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showReplaceExercise, setShowReplaceExercise] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Reset edited values only when template changes (preserve edits when toggling edit mode)
  useEffect(() => {
    setEditedName(template.name);
    setEditedExercises([...template.exerciseNames]);
  }, [template.id]);

  const handleDone = () => {
    // Save changes if onSave callback is provided
    if (onSave) {
      onSave(editedName.trim(), editedExercises);
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setEditedName(template.name);
    setEditedExercises([...template.exerciseNames]);
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

  const handleStart = () => {
    // Always use editedExercises (which may have been modified in edit mode)
    // If never edited, editedExercises equals template.exerciseNames
    onStart(editedExercises);
  };

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto">
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
              Exercises ({isEditMode ? editedExercises.length : template.exerciseNames.length})
            </p>
            {(isEditMode ? editedExercises : template.exerciseNames).map((exercise, index) => {
              const lastSession = lastSessionData.get(exercise);
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
                          className="cursor-grab active:cursor-grabbing touch-none"
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
                          {lastSession.sets.map((set, idx) => (
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

          {/* Actions */}
          <div className="space-y-3 pt-4">
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

      {/* Add Exercise Bottom Sheet */}
      <ExerciseSearchBottomSheet
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        title="Add Exercise"
      >
        <ExerciseSearch
          onSelectExercise={handleAddExercise}
          onAddNewExercise={handleAddNewExercise}
          selectedExercises={editedExercises}
          placeholder="Search exercises..."
          autoFocus={true}
          showDetails={true}
          createButtonLabel="Create & add"
        />
      </ExerciseSearchBottomSheet>

      {/* Replace Exercise Bottom Sheet */}
      <ExerciseSearchBottomSheet
        isOpen={showReplaceExercise}
        onClose={() => {
          setShowReplaceExercise(false);
          setReplaceIndex(null);
        }}
        title="Replace Exercise"
      >
        <ExerciseSearch
          onSelectExercise={handleReplaceSelect}
          onAddNewExercise={(name) => {
            handleReplaceSelect(name);
          }}
          placeholder="Search exercises..."
          autoFocus={true}
          showDetails={true}
          createButtonLabel="Replace"
        />
      </ExerciseSearchBottomSheet>
    </div>
  );
}