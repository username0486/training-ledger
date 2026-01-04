import { useState, useMemo, useEffect } from 'react';
import { ExerciseSearchInput } from './ExerciseSearchInput';
import { ExerciseList } from './ExerciseList';
import { Button } from './Button';
import { getAllExercisesList, filterExercises, ExerciseDBEntry } from '../utils/exerciseDb';

interface LogExerciseSearchProps {
  onSelectExercise: (exerciseName: string) => void;
  onAddNewExercise?: (exerciseName: string) => void;
}

export function LogExerciseSearch({ onSelectExercise, onAddNewExercise }: LogExerciseSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseDBEntry[]>([]);

  // Load all exercises on mount and when component updates
  useEffect(() => {
    const loadExercises = () => {
      const exercises = getAllExercisesList();
      setAllExercises(exercises);
    };
    
    // Load immediately
    loadExercises();
    
    // Also reload after a short delay to catch async initialization
    const timeout = setTimeout(loadExercises, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  // Filter exercises based on search term
  const filteredExercises = useMemo(() => {
    const filtered = filterExercises(allExercises, searchTerm);
    console.log('Search term:', searchTerm);
    console.log('Filtered exercises:', filtered.length);
    return filtered;
  }, [allExercises, searchTerm]);

  // Check if search term exactly matches any exercise name
  const exactMatch = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const trimmed = searchTerm.trim().toLowerCase();
    return allExercises.find(ex => ex.name.toLowerCase() === trimmed) || null;
  }, [allExercises, searchTerm]);

  // Check if we should show "Add as New Exercise" option
  // Show if there's a search term, no exact match, and either no results or user might want to add a variant
  const showAddNew = searchTerm.trim() !== '' && !exactMatch;

  const handleSelectExercise = (exercise: ExerciseDBEntry) => {
    onSelectExercise(exercise.name);
  };

  const handleAddNewExercise = () => {
    const trimmedName = searchTerm.trim();
    if (trimmedName && onAddNewExercise) {
      onAddNewExercise(trimmedName);
    }
  };

  return (
    <div className="space-y-3">
      <ExerciseSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search exercises..."
        autoFocus
      />
      
      {searchTerm.trim() && filteredExercises.length === 0 && showAddNew ? (
        <div className="py-8 text-center space-y-4">
          <div className="text-text-muted">
            <p className="mb-2">No exercises found matching "{searchTerm}"</p>
            <p className="text-sm">You can add it as a new exercise</p>
          </div>
          <Button
            variant="primary"
            onClick={handleAddNewExercise}
            className="mx-auto"
          >
            Add "{searchTerm.trim()}" as New Exercise
          </Button>
        </div>
      ) : (
        <>
          <ExerciseList
            exercises={filteredExercises}
            onSelect={handleSelectExercise}
            showDetails={true}
            emptyMessage={searchTerm.trim() ? "No exercises match your search" : "No exercises available"}
          />
          {!exactMatch && searchTerm.trim() && filteredExercises.length > 0 && (
            <>
              <div className="py-2">
                <div className="h-px bg-border-subtle"></div>
              </div>
              <div className="px-4 py-2">
                <Button
                  variant="neutral"
                  onClick={handleAddNewExercise}
                  className="w-full"
                >
                  Add "{searchTerm.trim()}" as New Exercise
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

