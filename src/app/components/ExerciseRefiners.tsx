// Optional refine row component for exercise search

import { type EquipmentLabel, type MuscleBucket } from '../../utils/exerciseDb/normalize';
import { type Refiner } from '../../utils/exerciseDb/smartSearch';

interface ExerciseRefinersProps {
  refiners: Refiner[];
  activeEquipment: Set<EquipmentLabel>;
  activeBuckets: Set<MuscleBucket>;
  onToggleEquipment: (equipment: EquipmentLabel) => void;
  onToggleBucket: (bucket: MuscleBucket) => void;
  onClear: () => void;
}

export function ExerciseRefiners({
  refiners,
  activeEquipment,
  activeBuckets,
  onToggleEquipment,
  onToggleBucket,
  onClear,
}: ExerciseRefinersProps) {
  if (refiners.length === 0) {
    return null;
  }

  const hasActiveRefiners = activeEquipment.size > 0 || activeBuckets.size > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap pb-2">
      {refiners.map((refiner) => {
        const isActive = refiner.type === 'equipment'
          ? activeEquipment.has(refiner.label as EquipmentLabel)
          : activeBuckets.has(refiner.label as MuscleBucket);

        return (
          <button
            key={`${refiner.type}-${refiner.label}`}
            onClick={() => {
              if (refiner.type === 'equipment') {
                onToggleEquipment(refiner.label as EquipmentLabel);
              } else {
                onToggleBucket(refiner.label as MuscleBucket);
              }
            }}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-full transition-colors
              ${isActive
                ? 'bg-accent text-white'
                : 'bg-surface border border-border-subtle text-text-muted hover:bg-surface-hover'
              }
            `}
          >
            {refiner.label}
            <span className="ml-1.5 opacity-70">({refiner.count})</span>
          </button>
        );
      })}
      {hasActiveRefiners && (
        <button
          onClick={onClear}
          className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

