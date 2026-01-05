import { useState } from 'react';
import { Plus, Trash2, GripVertical, Dumbbell, Search } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { addExerciseToDb } from '../utils/exerciseDb';

interface CreateWorkoutScreenProps {
  initialName?: string;
  initialExercises?: string[];
  onSave: (name: string, exercises: string[]) => void;
  onDiscard: () => void;
}

export function CreateWorkoutScreen({
  initialName = '',
  initialExercises = [],
  onSave,
  onDiscard,
}: CreateWorkoutScreenProps) {
  const [workoutName, setWorkoutName] = useState(initialName);
  const [exercises, setExercises] = useState<string[]>(initialExercises);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddExercise = (name: string) => {
    if (name.trim() && !exercises.includes(name.trim())) {
      const trimmedName = name.trim();
      
      // Add to database if it's a new exercise (ExerciseSearch handles recording as recent)
      try {
        addExerciseToDb(trimmedName);
      } catch (error) {
        // Exercise might already exist, that's fine
      }
      
      setExercises([...exercises, trimmedName]);
      setShowAddExercise(false);
    }
  };

  const handleAddNewExercise = (name: string) => {
    // Add new exercise to DB and to workout
    try {
      addExerciseToDb(name);
    } catch (error) {
      // Might already exist
    }
    handleAddExercise(name);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newExercises = [...exercises];
    const draggedItem = newExercises[draggedIndex];
    newExercises.splice(draggedIndex, 1);
    newExercises.splice(index, 0, draggedItem);
    
    setExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    if (workoutName.trim() && exercises.length > 0) {
      onSave(workoutName.trim(), exercises);
    }
  };

  const canSave = workoutName.trim() !== '' && exercises.length > 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Create Workout"
        onBack={onDiscard}
        rightAction={
          <Button 
            size="sm" 
            variant="primary" 
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Workout name */}
          <FloatingLabelInput
            label="Workout name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            autoFocus={!initialName}
            icon={<Dumbbell />}
          />

          {/* Exercise list */}
          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No exercises yet</p>
              <Button variant="primary" onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-text-muted px-1">
                Exercises ({exercises.length})
              </p>
              {exercises.map((exercise, index) => (
                <div
                  key={`${exercise}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-4 bg-surface rounded-xl border border-border transition-all cursor-grab active:cursor-grabbing ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-text-muted flex-shrink-0" />
                  <span className="flex-1">{exercise}</span>
                  <button
                    onClick={() => handleRemoveExercise(index)}
                    className="p-1.5 rounded-lg hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <Button
                variant="neutral"
                onClick={() => setShowAddExercise(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Exercise Bottom Sheet */}
      <ExerciseSearchBottomSheet
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false);
        }}
        title="Add Exercise"
      >
        <ExerciseSearch
          onSelectExercise={handleAddExercise}
          onAddNewExercise={handleAddNewExercise}
          selectedExercises={exercises}
          placeholder="Search exercises..."
          autoFocus={true}
          showDetails={true}
          createButtonLabel="Create & add"
        />
      </ExerciseSearchBottomSheet>
    </div>
  );
}