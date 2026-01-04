import { useState, useMemo, useEffect } from 'react';
import { ExerciseSearchInput } from './ExerciseSearchInput';
import { ExerciseList } from './ExerciseList';
import { getAllExercisesList, filterExercises, ExerciseDBEntry } from '../utils/exerciseDb';

interface ExerciseSearchInterfaceProps {
  onSelect?: (exercise: ExerciseDBEntry) => void;
  selectedExercises?: string[];
  showDetails?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function ExerciseSearchInterface({
  onSelect,
  selectedExercises = [],
  showDetails = false,
  placeholder,
  autoFocus = false,
  className = '',
}: ExerciseSearchInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseDBEntry[]>([]);

  // Load all exercises on mount
  useEffect(() => {
    const exercises = getAllExercisesList();
    setAllExercises(exercises);
    console.log('Total exercises loaded for search:', exercises.length);
  }, []);

  // Filter exercises based on search term
  const filteredExercises = useMemo(() => {
    const filtered = filterExercises(allExercises, searchTerm);
    console.log('Search term:', searchTerm);
    console.log('Filtered exercises:', filtered.length);
    return filtered;
  }, [allExercises, searchTerm]);

  return (
    <div className={`space-y-3 ${className}`}>
      <ExerciseSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      
      <ExerciseList
        exercises={filteredExercises}
        onSelect={onSelect}
        selectedExercises={selectedExercises}
        showDetails={showDetails}
        emptyMessage={searchTerm ? 'No exercises match your search' : 'No exercises available'}
      />
    </div>
  );
}


