import { ChevronLeft, LogOut, Mail, User as UserIcon, Moon, Sun } from 'lucide-react';
import { Button } from '../components/Button';
import { User } from '../utils/auth';

interface ProfileScreenProps {
  user: User;
  theme: 'light' | 'dark';
  onBack: () => void;
  onLogOut: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileScreen({ user, theme, onBack, onLogOut, onThemeChange }: ProfileScreenProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-panel transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-medium text-text-primary">Profile</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
          {/* Profile Info */}
          <div className="bg-panel rounded-2xl border border-border-subtle p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">
                  {user.name || 'User'}
                </h2>
                <p className="text-sm text-text-muted">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <Mail className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="text-xs text-text-muted">Email</p>
                  <p className="text-sm text-text-primary">{user.email}</p>
                </div>
              </div>

              {user.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                  <UserIcon className="w-5 h-5 text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Name</p>
                    <p className="text-sm text-text-primary">{user.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden">
            <h3 className="text-sm font-medium text-text-muted px-5 pt-4 pb-2">
              Appearance
            </h3>
            <div className="px-5 pb-5">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-text-muted" />
                  ) : (
                    <Sun className="w-5 h-5 text-text-muted" />
                  )}
                  <div>
                    <p className="text-sm text-text-primary">Theme</p>
                    <p className="text-xs text-text-muted">
                      {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                    </p>
                  </div>
                </div>
                
                {/* Theme pill toggle */}
                <div className="relative bg-surface/60 backdrop-blur-sm rounded-full p-1 border border-border-subtle">
                  {/* Sliding indicator */}
                  <div 
                    className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-accent/15 backdrop-blur-sm rounded-full transition-transform duration-200 ease-out border border-accent/30"
                    style={{
                      transform: theme === 'dark' ? 'translateX(calc(100% + 0.5rem))' : 'translateX(0)',
                    }}
                  />
                  
                  {/* Buttons */}
                  <div className="relative grid grid-cols-2 gap-1">
                    <button
                      onClick={() => onThemeChange('light')}
                      className={`py-2 px-4 flex items-center justify-center gap-1.5 transition-colors rounded-full relative z-10 ${
                        theme === 'light' ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`py-2 px-4 flex items-center justify-center gap-1.5 transition-colors rounded-full relative z-10 ${
                        theme === 'dark' ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Dark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden">
            <h3 className="text-sm font-medium text-text-muted px-5 pt-4 pb-2">
              Account
            </h3>
            <div className="divide-y divide-border-subtle">
              <button
                onClick={onLogOut}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-background transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-red-400">Log Out</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-center text-xs text-text-muted space-y-1">
            <p>Your workout data is synced to your account</p>
            <p>All exercises and progress are saved automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
}