import { forwardRef } from 'react';
import { ExerciseSearch, ExerciseSearchHandle } from './ExerciseSearch';

interface LogExerciseSearchProps {
  onSelectExercise: (exerciseName: string) => void;
  onAddNewExercise?: (exerciseName: string) => void;
}

export const LogExerciseSearch = forwardRef<ExerciseSearchHandle, LogExerciseSearchProps>(
  ({ onSelectExercise, onAddNewExercise }, ref) => {
    return (
      <div className="-mx-6 px-6">
        <ExerciseSearch
          ref={ref}
          onSelectExercise={onSelectExercise}
          onAddNewExercise={onAddNewExercise}
          placeholder="Search exercises..."
          autoFocus={true}
          showDetails={true}
          createButtonLabel="Create & start"
        />
      </div>
    );
  }
);

LogExerciseSearch.displayName = 'LogExerciseSearch';
