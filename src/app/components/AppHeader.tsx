import { UserCircle } from 'lucide-react';
import { User } from '../utils/auth';

interface AppHeaderProps {
  user: User | null;
  title?: string;
  subtitle?: string;
  onProfileClick: () => void;
}

export function AppHeader({ user, title, subtitle, onProfileClick }: AppHeaderProps) {
  if (!user) return null;

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
      <div className="max-w-2xl mx-auto px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {title && (
              <>
                <h1 className="text-3xl mb-1">{title}</h1>
                {subtitle && <p className="text-text-muted">{subtitle}</p>}
              </>
            )}
          </div>
          
          {/* Profile Icon */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 p-2 rounded-xl hover:bg-panel transition-colors group"
            aria-label="Open profile"
          >
            <div className="flex items-center gap-2">
              {user.name && (
                <span className="text-sm text-text-muted group-hover:text-text-primary transition-colors hidden sm:block">
                  {user.name}
                </span>
              )}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center group-hover:border-accent/40 transition-colors">
                <UserCircle className="w-6 h-6 text-accent" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
