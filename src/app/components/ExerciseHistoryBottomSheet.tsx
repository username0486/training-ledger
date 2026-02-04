import { formatWeightForDisplay } from '../../utils/weightFormat';
import { formatRelativeTime } from '../utils/storage';
import { CompactBottomSheet } from './CompactBottomSheet';

interface ExerciseHistorySession {
  sets: Array<{ weight: number; reps: number }>;
  date: number;
  workoutName?: string;
}

interface ExerciseHistoryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  sessions: ExerciseHistorySession[];
  onChipPress?: (weight: number, reps: number) => void;
}

/**
 * Bottom sheet showing last 4 logged sessions for an exercise
 * Each session shows relative time label and tappable pills
 */
export function ExerciseHistoryBottomSheet({
  isOpen,
  onClose,
  exerciseName,
  sessions,
  onChipPress,
}: ExerciseHistoryBottomSheetProps) {
  if (sessions.length === 0) return null;

  return (
    <CompactBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={exerciseName}
    >
      <div className="space-y-3 pb-2">
        {sessions.map((session, sessionIndex) => {
          const relativeTime = formatRelativeTime(session.date);
          
          return (
            <div key={sessionIndex} className="bg-surface/30 rounded-lg border border-border-subtle p-3 space-y-2">
              <p className="text-xs text-text-muted">
                {relativeTime}
              </p>
              <div className="flex flex-row flex-wrap gap-1.5">
                {session.sets.map((set, setIndex) => {
                  const chipLabel = `${formatWeightForDisplay(set.weight)} × ${set.reps}`;
                  return (
                    <button
                      key={setIndex}
                      onClick={() => {
                        onChipPress?.(set.weight, set.reps);
                        onClose(); // Close sheet after selecting
                      }}
                      className="px-2 py-1 bg-surface/50 rounded-md border border-border-subtle hover:bg-surface/70 hover:border-accent/30 active:bg-surface/80 transition-all text-xs text-text-primary"
                    >
                      {chipLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </CompactBottomSheet>
  );
}
