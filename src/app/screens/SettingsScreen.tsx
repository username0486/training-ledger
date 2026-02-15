import { useState, useEffect } from 'react';
import { Sun, Moon, ChevronRight } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { getAppearance, getUnitSystem, setAppearance, setUnitSystem, getLastImportTimestamp, Appearance, UnitSystem } from '../../utils/preferences';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUnitChange?: () => void;
  onBack: () => void;
  onNavigateToBackups: () => void;
}

function formatLastImport(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function SettingsScreen({ theme, onThemeChange, onUnitChange, onBack, onNavigateToBackups }: SettingsScreenProps) {
  const [currentAppearance, setCurrentAppearance] = useState<Appearance>(theme);
  const [currentUnit, setCurrentUnit] = useState<UnitSystem>(getUnitSystem());
  const lastImport = getLastImportTimestamp();

  // Sync with preferences on mount
  useEffect(() => {
    setCurrentAppearance(getAppearance());
    setCurrentUnit(getUnitSystem());
  }, []);

  const handleUnitChange = (newUnit: UnitSystem) => {
    setCurrentUnit(newUnit);
    setUnitSystem(newUnit);
    if (onUnitChange) {
      onUnitChange();
    }
  };

  const handleThemeChange = (newAppearance: Appearance) => {
    setCurrentAppearance(newAppearance);
    setAppearance(newAppearance);
    onThemeChange(newAppearance);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-6">
          {/* User Settings Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              User Settings
            </h2>
            
            <div className="border border-border-subtle rounded-lg bg-surface overflow-hidden">
              {/* Units Row */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle last:border-b-0">
                <label className="text-base text-text-primary flex-shrink-0">
                  Units
                </label>
                <div className="flex-shrink-0 w-44">
                  <SegmentedToggle
                    options={[
                      {
                        value: 'metric' as UnitSystem,
                        label: 'kg',
                        ariaLabel: 'Kilograms',
                      },
                      {
                        value: 'imperial' as UnitSystem,
                        label: 'lb',
                        ariaLabel: 'Pounds',
                      },
                    ]}
                    value={currentUnit}
                    onChange={handleUnitChange}
                    ariaLabel="Units"
                    fullWidth
                  />
                </div>
              </div>

              {/* Theme Row */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <label className="text-base text-text-primary flex-shrink-0">
                  Theme
                </label>
                <div className="flex-shrink-0 w-44">
                  <SegmentedToggle
                    options={[
                      {
                        value: 'light' as Appearance,
                        label: '',
                        icon: <Sun className="w-5 h-5" />,
                        ariaLabel: 'light mode',
                      },
                      {
                        value: 'dark' as Appearance,
                        label: '',
                        icon: <Moon className="w-5 h-5" />,
                        ariaLabel: 'dark mode',
                      },
                    ]}
                    value={currentAppearance}
                    onChange={handleThemeChange}
                    ariaLabel="Appearance"
                    fullWidth
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Data
            </h2>
            
            <div className="border border-border-subtle rounded-lg bg-surface overflow-hidden">
              <button
                onClick={onNavigateToBackups}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface/60 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-base text-text-primary">Backups & data</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {lastImport
                      ? `Import, export, delete · Last import ${formatLastImport(lastImport)}`
                      : 'Import, export, delete'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Version Display */}
          <div className="pt-4">
            <p className="text-xs text-text-muted text-center">
              {(() => {
                const version = import.meta.env.VITE_APP_VERSION || 'dev';
                const gitSha = import.meta.env.VITE_GIT_SHA;
                if (version === 'dev') {
                  return 'App version dev';
                }
                return gitSha ? `App version ${version} (${gitSha})` : `App version ${version}`;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
