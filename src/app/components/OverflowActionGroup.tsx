import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface OverflowAction {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
}

interface OverflowActionGroupProps {
  actions: OverflowAction[];
}

/**
 * Reusable component for grouped overflow action menus
 * Displays actions in a grouped, outlined container with row-based layout
 */
export function OverflowActionGroup({ actions }: OverflowActionGroupProps) {
  if (actions.length === 0) return null;

  return (
    <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onPress}
            className={`
              w-full flex items-center justify-start gap-3 px-4 py-3.5
              transition-colors
              ${index > 0 ? 'border-t border-border-subtle' : ''}
              ${action.destructive 
                ? 'text-danger hover:bg-danger/10 active:bg-danger/20' 
                : 'text-text-primary hover:bg-surface/60 active:bg-surface/80'
              }
            `}
          >
            {Icon && (
              <Icon className={`w-5 h-5 ${action.destructive ? 'text-danger' : 'text-text-muted'}`} />
            )}
            <span className="font-medium text-left">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
