import { forwardRef } from 'react';

interface MetricInputCardProps {
  label: 'Weight' | 'Reps' | string;
  value: string | number;
  onChange: (value: string) => void;
  unit?: string;
  inputMode: 'decimal' | 'numeric';
  min?: number;
  step?: number;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Reusable metric input card component matching Figma/Tailwind spec
 * Used for Weight and Reps inputs across the app
 */
export const MetricInputCard = forwardRef<HTMLInputElement, MetricInputCardProps>(
  ({ 
    label, 
    value, 
    onChange, 
    unit, 
    inputMode, 
    min, 
    step, 
    placeholder = '0',
    autoFocus = false,
    className = ''
  }, ref) => {
    return (
      <div className={`bg-surface rounded-xl p-3 border border-border-subtle hover:border-accent/30 transition-all ${className}`}>
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          <input
            ref={ref}
            type="number"
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            step={step}
            autoFocus={autoFocus}
            className="w-full bg-transparent border-none text-3xl font-bold tabular-nums text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:ring-0 p-0"
          />
          {unit && (
            <span className="text-lg text-text-muted font-medium">{unit}</span>
          )}
        </div>
      </div>
    );
  }
);

MetricInputCard.displayName = 'MetricInputCard';
