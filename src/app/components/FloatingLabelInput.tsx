import { forwardRef, useState } from 'react';

interface FloatingLabelInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  minLength?: number;
  min?: number;
  step?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, type = 'text', value, onChange, className = '', icon, required, disabled, autoFocus, minLength, min, step, onKeyDown, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined && value !== '';
    const isActive = isFocused || hasValue;

    return (
      <div className={`relative ${className}`}>
        {/* Icon */}
        {icon && (
          <div className={`absolute left-3 transition-all duration-200 pointer-events-none ${
            isActive ? 'top-[1.875rem]' : 'top-1/2 -translate-y-1/2'
          }`}>
            <div className={`w-5 h-5 flex items-center justify-center transition-colors ${
              isFocused ? 'text-accent' : 'text-text-muted'
            }`}>
              {icon}
            </div>
          </div>
        )}

        {/* Floating Label */}
        <label
          className={`absolute transition-all duration-200 pointer-events-none ${
            icon ? 'left-10' : 'left-4'
          } ${
            isActive
              ? 'top-2 text-xs text-accent'
              : 'top-1/2 -translate-y-1/2 text-base text-text-muted'
          }`}
        >
          {label}
        </label>

        {/* Input */}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={onKeyDown}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          minLength={minLength}
          min={min}
          step={step}
          className={`w-full bg-surface border border-border-subtle rounded-lg 
            text-text-primary
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors ${
              icon ? 'pl-10 pr-4' : 'px-4'
            } ${
              isActive ? 'pt-6 pb-2' : 'py-4'
            }`}
          {...props}
        />
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';