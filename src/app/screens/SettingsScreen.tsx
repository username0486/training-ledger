import { useState, useEffect } from 'react';
import { Sun, Moon, Scale, Weight as WeightIcon } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { getAppearance, getUnitSystem, setAppearance, setUnitSystem, Appearance, UnitSystem } from '../../utils/preferences';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUnitChange?: () => void;
  onBack: () => void;
}

export function SettingsScreen({ theme, onThemeChange, onUnitChange, onBack }: SettingsScreenProps) {
  const [currentAppearance, setCurrentAppearance] = useState<Appearance>(theme);
  const [currentUnit, setCurrentUnit] = useState<UnitSystem>(getUnitSystem());

  // Sync with preferences on mount
  useEffect(() => {
    setCurrentAppearance(getAppearance());
    setCurrentUnit(getUnitSystem());
  }, []);


  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-2">
          {/* Units Section */}
          <div className="flex items-center justify-between gap-4 py-2">
            <label className="text-sm font-medium text-text-primary flex-shrink-0">
              Units
            </label>
            <div className="flex-shrink-0">
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
                onChange={(newUnit) => {
                  setCurrentUnit(newUnit);
                  setUnitSystem(newUnit);
                  if (onUnitChange) {
                    onUnitChange();
                  }
                }}
                ariaLabel="Units"
              />
            </div>
          </div>

          {/* Appearance Section */}
          <div className="flex items-center justify-between gap-4 py-2">
            <label className="text-sm font-medium text-text-primary flex-shrink-0">
              Appearance
            </label>
            <div className="flex-shrink-0">
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
                onChange={(newAppearance) => {
                  setCurrentAppearance(newAppearance);
                  setAppearance(newAppearance);
                  onThemeChange(newAppearance);
                }}
                ariaLabel="Appearance"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

