import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Scale } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { getAppearance, getUnitSystem, setAppearance, setUnitSystem, Appearance, UnitSystem } from '../../utils/preferences';

interface SettingsMenuProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUnitChange?: () => void; // Callback when unit changes (to trigger re-renders)
}

export function SettingsMenu({ theme, onThemeChange, onUnitChange }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAppearance, setCurrentAppearance] = useState<Appearance>(theme);
  const [currentUnit, setCurrentUnit] = useState<UnitSystem>(getUnitSystem());

  // Sync with preferences on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentAppearance(getAppearance());
      setCurrentUnit(getUnitSystem());
    }
  }, [isOpen]);

  const handleAppearanceToggle = () => {
    const newAppearance: Appearance = currentAppearance === 'light' ? 'dark' : 'light';
    setCurrentAppearance(newAppearance);
    setAppearance(newAppearance);
    onThemeChange(newAppearance);
  };

  const handleUnitToggle = () => {
    const newUnit: UnitSystem = currentUnit === 'metric' ? 'imperial' : 'metric';
    setCurrentUnit(newUnit);
    setUnitSystem(newUnit);
    if (onUnitChange) {
      onUnitChange();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl hover:bg-panel transition-colors text-text-muted hover:text-text-primary"
        aria-label="Menu"
        title="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Settings"
        position="top"
      >
        <div className="space-y-4">
          {/* Units Section */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Units
            </label>
            <button
              onClick={handleUnitToggle}
              className="w-full flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-subtle hover:bg-surface/70 transition-colors"
              aria-label={`Units: ${currentUnit === 'metric' ? 'kg' : 'lb'}`}
            >
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-text-muted" />
                <span className="text-text-primary">Weight</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentUnit === 'metric'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  kg
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentUnit === 'imperial'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  lb
                </span>
              </div>
            </button>
          </div>

          {/* Appearance Section */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Appearance
            </label>
            <button
              onClick={handleAppearanceToggle}
              className="w-full flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-subtle hover:bg-surface/70 transition-colors"
              aria-label={`Appearance: ${currentAppearance === 'light' ? 'light' : 'dark'}`}
            >
              <div className="flex items-center gap-3">
                {currentAppearance === 'light' ? (
                  <Sun className="w-5 h-5 text-text-muted" />
                ) : (
                  <Moon className="w-5 h-5 text-text-muted" />
                )}
                <span className="text-text-primary">Theme</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentAppearance === 'light'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  Light
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentAppearance === 'dark'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  Dark
                </span>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

