import { ReactNode } from 'react';

interface SegmentedToggleOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

interface SegmentedToggleProps<T> {
  options: [SegmentedToggleOption<T>, SegmentedToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedToggle<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedToggleProps<T>) {
  const [option1, option2] = options;
  const isOption1Selected = value === option1.value;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="relative inline-flex p-1 bg-surface/50 rounded-lg border border-border-subtle"
    >
      {/* Sliding background indicator */}
      <div
        className={`absolute top-1 bottom-1 rounded-md bg-accent transition-all duration-200 ease-out ${
          isOption1Selected 
            ? 'left-1 right-[calc(50%+0.125rem)]' 
            : 'left-[calc(50%+0.125rem)] right-1'
        }`}
      />

      {/* Option 1 */}
      <button
        type="button"
        onClick={() => onChange(option1.value)}
        className={`relative z-10 flex items-center justify-center gap-2 rounded-md transition-colors ${
          option1.label ? 'px-4 py-2 min-w-[80px]' : 'p-2 min-w-[44px]'
        } ${
          isOption1Selected
            ? 'text-white'
            : 'text-text-muted hover:text-text-primary'
        }`}
        aria-label={
          ariaLabel && option1.ariaLabel 
            ? `${ariaLabel}, ${option1.ariaLabel}`
            : ariaLabel && option1.label
            ? `${ariaLabel}, ${option1.label}${isOption1Selected ? ' selected' : ''}`
            : option1.ariaLabel || option1.label || undefined
        }
        aria-pressed={isOption1Selected}
      >
        {option1.icon && (
          <span className={`flex-shrink-0 flex items-center justify-center ${option1.label ? 'w-4 h-4' : 'w-5 h-5'}`}>
            {option1.icon}
          </span>
        )}
        {option1.label && <span className="text-sm font-medium">{option1.label}</span>}
      </button>

      {/* Option 2 */}
      <button
        type="button"
        onClick={() => onChange(option2.value)}
        className={`relative z-10 flex items-center justify-center gap-2 rounded-md transition-colors ${
          option2.label ? 'px-4 py-2 min-w-[80px]' : 'p-2 min-w-[44px]'
        } ${
          !isOption1Selected
            ? 'text-white'
            : 'text-text-muted hover:text-text-primary'
        }`}
        aria-label={
          ariaLabel && option2.ariaLabel 
            ? `${ariaLabel}, ${option2.ariaLabel}`
            : ariaLabel && option2.label
            ? `${ariaLabel}, ${option2.label}${!isOption1Selected ? ' selected' : ''}`
            : option2.ariaLabel || option2.label || undefined
        }
        aria-pressed={!isOption1Selected}
      >
        {option2.icon && (
          <span className={`flex-shrink-0 flex items-center justify-center ${option2.label ? 'w-4 h-4' : 'w-5 h-5'}`}>
            {option2.icon}
          </span>
        )}
        {option2.label && <span className="text-sm font-medium">{option2.label}</span>}
      </button>
    </div>
  );
}

