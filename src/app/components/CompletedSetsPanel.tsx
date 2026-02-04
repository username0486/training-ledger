import { Set } from '../types';
import { formatWeightForDisplay } from '../../utils/weightFormat';
import { getSetsInDisplayOrder } from '../utils/setOrdering';

interface CompletedSetsPanelProps {
  sets: Set[];
  onSelectSet?: (setId: string, setIndex: number) => void;
  exerciseId?: string; // For scoping/debugging
}

/**
 * Reusable component for displaying completed sets
 * Used in both standalone exercises and Group exercise sub-cards
 * Chips are tappable to open edit/delete sheet
 * Sets are displayed in chronological order (oldest → newest)
 */
export function CompletedSetsPanel({
  sets,
  onSelectSet,
  exerciseId,
}: CompletedSetsPanelProps) {
  if (sets.length === 0) return null;

  // Sort sets in chronological order (oldest → newest)
  const sortedSets = getSetsInDisplayOrder(sets);

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-text-muted">Sets</p>
      <div className="flex flex-row flex-wrap gap-2">
        {sortedSets.map((set, index) => (
          <button
            key={set.id}
            onClick={() => onSelectSet?.(set.id, index)}
            className="flex items-center gap-2 px-3 py-2 bg-panel rounded-lg border border-border-subtle hover:border-accent/30 transition-all text-left"
            aria-label={`Edit set ${index + 1}`}
          >
            <span className="text-text-primary text-sm whitespace-nowrap">
              {formatWeightForDisplay(set.weight)} × {set.reps}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
