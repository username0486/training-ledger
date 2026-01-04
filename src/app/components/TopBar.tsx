import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({ title, onBack, rightAction }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-panel/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-surface transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {title && (
          <h1 className="text-lg truncate">{title}</h1>
        )}
      </div>
      {rightAction && <div className="ml-3">{rightAction}</div>}
    </div>
  );
}
