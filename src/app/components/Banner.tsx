import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BannerProps {
  message: string;
  variant?: 'info' | 'warning' | 'error';
  onDismiss?: () => void;
  autoHide?: number;
}

export function Banner({ message, variant = 'info', onDismiss, autoHide }: BannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  if (!isVisible) return null;

  const variantClasses = {
    info: 'bg-accent-muted border-accent/30 text-accent',
    warning: 'bg-surface border-border-medium text-text-muted',
    error: 'bg-danger-muted border-danger/30 text-danger',
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`mx-auto max-w-md rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3 ${variantClasses[variant]}`}>
        <p className="flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
