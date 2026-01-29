import { formatWeightForDisplay } from '../../utils/weightFormat';
import { formatRelativeTime } from '../utils/storage';

interface LastSessionStatsProps {
  lastSessionData: {
    sets: Array<{ weight: number; reps: number }>;
    date: number;
  };
  onChipPress?: (weight: number, reps: number) => void;
  maxChips?: number; // Maximum number of chips to show (default: 5)
}

/**
 * Standardized last session stats display component
 * Shows relative time header and tappable chips for each set in a grouped container
 * - Container wraps relative time (e.g., "1 week ago", "Yesterday") and chips
 * - Chips represent last-session sets (e.g., "80 × 5", "50 × 10")
 * - IMPORTANT: This component ONLY displays previous completed session data.
 *   It never includes current session sets or draft input values.
 */
export function LastSessionStats({ lastSessionData, onChipPress, maxChips = 5 }: LastSessionStatsProps) {
  if (!lastSessionData || lastSessionData.sets.length === 0) return null;

  const relativeTime = formatRelativeTime(lastSessionData.date);
  
  // Create a defensive copy to ensure we never mutate the original data
  // Show last N sets (most recent first)
  const setsToShow = [...lastSessionData.sets].slice(-maxChips).reverse();

  return (
    <div className="w-full bg-surface/30 rounded-lg border border-border-subtle p-3 space-y-2">
      <p className="text-xs text-text-muted">
        {relativeTime}
      </p>
      <div className="flex flex-row flex-wrap gap-2">
        {setsToShow.map((set, index) => {
          const chipLabel = `${formatWeightForDisplay(set.weight)} × ${set.reps}`;
          return (
            <button
              key={index}
              onClick={() => onChipPress?.(set.weight, set.reps)}
              className="px-2.5 py-1.5 bg-surface/50 rounded-lg border border-border-subtle hover:bg-surface/70 hover:border-accent/30 active:bg-surface/80 transition-all text-sm text-text-primary"
            >
              {chipLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
