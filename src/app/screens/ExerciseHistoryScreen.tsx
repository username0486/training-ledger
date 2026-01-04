import { TrendingUp, TrendingDown } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Workout } from '../types';
import { formatDate } from '../utils/storage';

interface ExerciseHistoryScreenProps {
  exerciseName: string;
  workouts: Workout[];
  onBack: () => void;
  onViewWorkout?: (workoutId: string) => void;
}

interface ExercisePerformance {
  workoutId: string;
  workoutName: string;
  date: number;
  sets: Array<{ weight: number; reps: number; id: string; restDuration?: number }>;
  totalVolume: number;
  avgWeight: number;
}

export function ExerciseHistoryScreen({
  exerciseName,
  workouts,
  onBack,
  onViewWorkout,
}: ExerciseHistoryScreenProps) {
  // Find all instances of this exercise across workouts
  const performances: ExercisePerformance[] = workouts
    .map(workout => {
      const exercise = workout.exercises.find(ex => ex.name === exerciseName);
      if (!exercise) return null;

      const totalVolume = exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      const avgWeight = exercise.sets.reduce((sum, set) => sum + set.weight, 0) / exercise.sets.length;

      return {
        workoutId: workout.id,
        workoutName: workout.name,
        date: workout.endTime || workout.startTime,
        sets: exercise.sets,
        totalVolume,
        avgWeight,
      };
    })
    .filter((perf): perf is ExercisePerformance => perf !== null)
    .sort((a, b) => b.date - a.date);

  // Calculate trends
  const getWeightTrend = (index: number): 'up' | 'down' | 'same' | null => {
    if (index === performances.length - 1) return null;
    const current = performances[index].avgWeight;
    const previous = performances[index + 1].avgWeight;
    const diff = current - previous;
    if (Math.abs(diff) < 0.5) return 'same';
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title={exerciseName} onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Sessions</p>
              <p className="text-2xl">{performances.length}</p>
            </Card>
            <Card className="text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Max Weight Logged</p>
              <p className="text-2xl">
                {Math.max(...performances.map(p => p.avgWeight)).toFixed(1)} kg
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Max Volume Logged</p>
              <p className="text-2xl">
                {Math.max(...performances.map(p => p.totalVolume)).toFixed(0)} kg
              </p>
            </Card>
          </div>

          {/* Session History */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">History</h2>
            
            {performances.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-text-muted">No history for this exercise yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {performances.map((perf, index) => {
                  const trend = getWeightTrend(index);
                  
                  return (
                    <Card 
                      key={perf.workoutId} 
                      gradient
                      onClick={onViewWorkout ? () => onViewWorkout(perf.workoutId) : undefined}
                      className={onViewWorkout ? "cursor-pointer" : ""}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="mb-0.5 truncate">{perf.workoutName}</h3>
                            <p className="text-text-muted">{formatDate(perf.date)}</p>
                          </div>
                          {trend && trend !== 'same' && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                              trend === 'up' ? 'bg-accent/10' : 'bg-surface'
                            }`}>
                              {trend === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-accent" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-text-muted" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Sets */}
                        <div className="space-y-1.5">
                          {perf.sets.map((set, setIndex) => (
                            <div
                              key={set.id}
                              className="flex items-center justify-between p-2.5 bg-surface rounded-lg"
                            >
                              <span className="text-text-muted text-sm">Set {setIndex + 1}</span>
                              <div className="text-sm flex items-center gap-2">
                                <span>{set.weight} kg</span>
                                <span className="text-text-muted">×</span>
                                <span>{set.reps} reps</span>
                                {set.restDuration !== undefined && set.restDuration > 0 && (
                                  <>
                                    <span className="text-text-muted/40">·</span>
                                    <span className="text-text-muted/60 text-xs tabular-nums">
                                      {Math.floor(set.restDuration / 60)}:{(set.restDuration % 60).toString().padStart(2, '0')} rest
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 pt-2 border-t border-border-subtle">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">
                              Total Volume
                            </p>
                            <p className="text-text-primary">{perf.totalVolume.toFixed(0)} kg</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">
                              Avg Weight
                            </p>
                            <p className="text-text-primary">{perf.avgWeight.toFixed(1)} kg</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}