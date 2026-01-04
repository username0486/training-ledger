import { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface ExerciseSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const ExerciseSearchInput = forwardRef<HTMLInputElement, ExerciseSearchInputProps>(
  ({ value, onChange, placeholder = 'Search exercises...', className = '', autoFocus = false }, ref) => {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-subtle rounded-lg 
            text-text-primary placeholder:text-text-muted 
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
            transition-colors"
        />
      </div>
    );
  }
);

ExerciseSearchInput.displayName = 'ExerciseSearchInput';


