import { useState } from 'react';
import { Plus, Trash2, GripVertical, Dumbbell, Search } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { loadExercisesDB, searchExercises, addExerciseToDb } from '../utils/exerciseDb';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const exercisesDB = loadExercisesDB();
  const searchResults = searchExercises(searchQuery, exercisesDB);
  const hasMatches = searchResults.length > 0;
  const showFallback = searchQuery.trim() !== '' && !hasMatches;

  const handleAddExercise = (name: string) => {
    if (name.trim() && !exercises.includes(name.trim())) {
      const trimmedName = name.trim();
      
      // Add to database if it's a new exercise
      if (!exercisesDB.includes(trimmedName)) {
        addExerciseToDb(trimmedName);
      }
      
      setExercises([...exercises, trimmedName]);
      setSearchQuery('');
      setShowAddExercise(false);
    }
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
          setSearchQuery('');
        }}
        title="Add Exercise"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          
          <div className="space-y-1">
            {hasMatches ? (
              searchResults.map((exerciseName) => (
                <button
                  key={exerciseName}
                  onClick={() => handleAddExercise(exerciseName)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={exercises.includes(exerciseName)}
                >
                  <p className="text-text-primary">
                    {exerciseName}
                    {exercises.includes(exerciseName) && (
                      <span className="text-text-muted ml-2">(added)</span>
                    )}
                  </p>
                </button>
              ))
            ) : showFallback ? (
              <button
                onClick={() => handleAddExercise(searchQuery)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-text-primary mb-0.5">Add new exercise</p>
                  <p className="text-text-muted">{searchQuery}</p>
                </div>
                <span className="text-accent">Add</span>
              </button>
            ) : null}
          </div>
        </div>
      </ExerciseSearchBottomSheet>
    </div>
  );
}