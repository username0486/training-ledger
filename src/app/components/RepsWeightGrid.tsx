import { useRef } from 'react';
import { MetricInputCard } from './MetricInputCard';
import { getWeightUnit, getWeightStep } from '../../utils/weightFormat';

interface RepsWeightGridProps {
  weight: string | number; // Weight in display unit (kg or lb)
  reps: string | number;
  onWeightChange: (value: string) => void; // Receives value in display unit
  onRepsChange: (value: string) => void;
  weightAutoFocus?: boolean;
  repsAutoFocus?: boolean;
  className?: string;
}

/**
 * Wrapper component that renders Weight and Reps inputs in a 2-column grid
 * Matches the exact styling spec from Figma/Tailwind
 * Weight input displays and accepts values in the current unit preference (kg or lb)
 */
export function RepsWeightGrid({
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  weightAutoFocus = false,
  repsAutoFocus = false,
  className = '',
}: RepsWeightGridProps) {
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);

  const weightUnit = getWeightUnit();
  const weightStep = getWeightStep();

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <MetricInputCard
        ref={weightInputRef}
        label="Weight"
        value={weight}
        onChange={onWeightChange}
        unit={weightUnit}
        inputMode="decimal"
        min={0}
        step={weightStep}
        placeholder="0"
        autoFocus={weightAutoFocus}
      />
      <MetricInputCard
        ref={repsInputRef}
        label="Reps"
        value={reps}
        onChange={onRepsChange}
        inputMode="numeric"
        min={0}
        step={1}
        placeholder="0"
        autoFocus={repsAutoFocus}
      />
    </div>
  );
}
