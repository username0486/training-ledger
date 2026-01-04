import { forwardRef } from 'react';

interface InputProps {
  type?: 'text' | 'number' | 'search';
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  min?: number;
  step?: number;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'search' | 'tel' | 'url';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', placeholder, value, onChange, className = '', disabled = false, autoFocus = false, min, step, inputMode }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        min={min}
        step={step}
        inputMode={inputMode}
        className={`w-full px-4 py-2.5 bg-surface border border-border-subtle rounded-lg 
          text-text-primary placeholder:text-text-muted 
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors ${className}`}
      />
    );
  }
);

Input.displayName = 'Input';
