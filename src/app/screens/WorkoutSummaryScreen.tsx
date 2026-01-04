import { Play, Edit2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Workout } from '../types';
import { formatDate } from '../utils/storage';

interface WorkoutSummaryScreenProps {
  workout: Workout;
  isJustCompleted?: boolean;
  isSingleExercise?: boolean;
  onBack: () => void;
  onStartAgain?: () => void;
  onAddAnother?: () => void;
  onEditExercise?: (exerciseId: string) => void;
  onViewExerciseHistory?: (exerciseName: string) => void;
}

export function WorkoutSummaryScreen({
  workout,
  isJustCompleted = false,
  isSingleExercise = false,
  onBack,
  onStartAgain,
  onAddAnother,
  onEditExercise,
  onViewExerciseHistory,
}: WorkoutSummaryScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Summary" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-6">
          {/* Workout info */}
          <div>
            <h2 className="text-2xl mb-2">{workout.name}</h2>
            <p className="text-text-muted">
              {formatDate(workout.endTime || workout.startTime)} · {workout.exercises.length} exercises
            </p>
          </div>

          {/* Exercise breakdown */}
          <div className="space-y-4">
            {workout.exercises.map((exercise) => {
              const totalVolume = exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
              const avgWeight = exercise.sets.reduce((sum, set) => sum + set.weight, 0) / exercise.sets.length;

              return (
                <Card 
                  key={exercise.id} 
                  gradient
                  onClick={onViewExerciseHistory ? () => onViewExerciseHistory(exercise.name) : undefined}
                  className={onViewExerciseHistory ? "cursor-pointer" : ""}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="flex-1">{exercise.name}</h3>
                    {onEditExercise && isSingleExercise && (
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
                    {exercise.sets.map((set, index) => (
                      <div
                        key={set.id}
                        className="flex items-center justify-between p-3 bg-surface rounded-lg"
                      >
                        <span className="text-text-muted">Set {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span>{set.weight} kg</span>
                          <span className="text-text-muted">×</span>
                          <span>{set.reps} reps</span>
                          {set.restDuration !== undefined && set.restDuration > 0 && (
                            <>
                              <span className="text-text-muted/40">·</span>
                              <span className="text-text-muted/60 text-sm tabular-nums">
                                {Math.floor(set.restDuration / 60)}:{(set.restDuration % 60).toString().padStart(2, '0')} rest
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mb-4 text-text-muted">
                    <div>
                      <span className="text-xs uppercase tracking-wide">Total Volume</span>
                      <p className="text-text-primary">{totalVolume.toFixed(0)} kg</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide">Avg Weight</span>
                      <p className="text-text-primary">{avgWeight.toFixed(1)} kg</p>
                    </div>
                  </div>

                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="space-y-3 pb-6">
            {!isJustCompleted && onStartAgain && (
              <Button variant="primary" onClick={onStartAgain} className="w-full">
                <Play className="w-4 h-4 mr-2 inline" />
                {isSingleExercise ? 'Repeat Exercise' : 'Repeat Workout'}
              </Button>
            )}
            {isJustCompleted && (
              <Button variant="neutral" onClick={onBack} className="w-full">
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}