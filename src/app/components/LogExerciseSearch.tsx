import { ExerciseSearch } from './ExerciseSearch';

interface LogExerciseSearchProps {
  onSelectExercise: (exerciseName: string) => void;
  onAddNewExercise?: (exerciseName: string) => void;
}

export function LogExerciseSearch({ onSelectExercise, onAddNewExercise }: LogExerciseSearchProps) {
  return (
    <div className="-mx-6 px-6">
      <ExerciseSearch
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
