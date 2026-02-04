import { ChevronRight } from 'lucide-react';
import { formatWeightForDisplay } from '../../utils/weightFormat';
import { formatRelativeTime } from '../utils/storage';

interface LastSessionStatsProps {
  lastSessionData: {
    sets: Array<{ weight: number; reps: number }>;
    date: number;
  };
  onChipPress?: (weight: number, reps: number) => void;
  onLabelPress?: () => void; // Callback when label row is tapped
  comparisonFlag?: string | null; // Optional comparison flag message
  maxChips?: number; // Maximum number of chips to show (default: 5)
  showLastLoggedPrefix?: boolean; // Whether to show "Last logged •" prefix (default: false)
  showChevron?: boolean; // Whether to show chevron icon (default: true)
}

/**
 * Standardized last session stats display component
 * Shows "Last logged • {relative_time}" label with chevron (tappable to open bottom sheet)
 * Shows tappable chips for each set in a grouped container
 * Shows optional comparison flag below label
 * - Container wraps relative time (e.g., "Last logged • 1 week ago") and chips
 * - Chips represent last-session sets (e.g., "80 × 5", "50 × 10")
 * - IMPORTANT: This component ONLY displays previous completed session data.
 *   It never includes current session sets or draft input values.
 */
export function LastSessionStats({ 
  lastSessionData, 
  onChipPress, 
  onLabelPress,
  comparisonFlag,
  maxChips = 5,
  showLastLoggedPrefix = false,
  showChevron = true
}: LastSessionStatsProps) {
  if (!lastSessionData || lastSessionData.sets.length === 0) return null;

  const relativeTime = formatRelativeTime(lastSessionData.date);
  const labelText = showLastLoggedPrefix ? `Last logged • ${relativeTime}` : relativeTime;
  
  // Create a defensive copy to ensure we never mutate the original data
  // Show last N sets in chronological order (oldest → newest)
  // Note: lastSessionData.sets should already be in chronological order from storage
  // We take the last N sets (most recent) but display them in chronological order
  const allSets = [...lastSessionData.sets];
  const setsToShow = allSets.slice(-maxChips);

  return (
    <div className="w-full bg-surface/30 rounded-lg border border-border-subtle p-3 space-y-2">
      {/* Label row - tappable if onLabelPress is provided */}
      {onLabelPress ? (
        <button
          onClick={onLabelPress}
          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-xs text-text-muted">
            {labelText}
          </p>
          {showChevron && (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          )}
        </button>
      ) : (
        <p className="text-xs text-text-muted">
          {labelText}
        </p>
      )}
      
      {/* Comparison flag - shown below label if provided */}
      {comparisonFlag && (
        <p className="text-xs text-text-muted/70 -mt-2">
          {comparisonFlag}
        </p>
      )}
      
      {/* Pills */}
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
