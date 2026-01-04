import { Sun, Moon } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function AppHeader({ title, subtitle, theme, onThemeChange }: AppHeaderProps) {
  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

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
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-panel transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-text-muted" />
            ) : (
              <Sun className="w-5 h-5 text-text-muted" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
