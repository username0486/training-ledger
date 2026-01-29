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

export function SettingsScreen({ theme, onThemeChange, onUnitChange, onBack, onDataImported }: SettingsScreenProps) {
  const [currentAppearance, setCurrentAppearance] = useState<Appearance>(theme);
  const [currentUnit, setCurrentUnit] = useState<UnitSystem>(getUnitSystem());
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Sync with preferences on mount
  useEffect(() => {
    setCurrentAppearance(getAppearance());
    setCurrentUnit(getUnitSystem());
  }, []);

  const handleExport = () => {
    try {
      const exported = exportData();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-ledger-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Failed to export data. Please check the console for details.');
    }
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportError('Please paste JSON data to import');
      return;
    }

    if (!confirm('This will replace all your current data. Are you sure you want to continue?')) {
      return;
    }

    const result = importData(importText);
    if (result.success) {
      setImportError(null);
      setImportText('');
      setShowImport(false);
      if (onDataImported) {
        onDataImported();
      }
      alert('Data imported successfully!');
    } else {
      setImportError(result.error || 'Failed to import data');
    }
  };


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
                onChange={(newUnit) => {
                  setCurrentUnit(newUnit);
                  setUnitSystem(newUnit);
                  if (onUnitChange) {
                    onUnitChange();
                  }
                }}
                ariaLabel="Units"
                fullWidth
              />
            </div>
          </div>

          {/* Appearance Section */}
          <div className="flex items-center justify-between gap-4 py-2">
            <label className="text-sm font-medium text-text-primary flex-shrink-0">
              Appearance
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
                onChange={(newAppearance) => {
                  setCurrentAppearance(newAppearance);
                  setAppearance(newAppearance);
                  onThemeChange(newAppearance);
                }}
                ariaLabel="Appearance"
                fullWidth
              />
            </div>
          </div>

          {/* Data Management Section */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Data Management</h3>
            
            <Button
              variant="neutral"
              onClick={handleExport}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export Backup
            </Button>
            <p className="text-xs text-text-muted">
              Download a backup of all your workouts, templates, and session data.
            </p>

            <Button
              variant="neutral"
              onClick={() => setShowImport(!showImport)}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2 inline" />
              Import Backup
            </Button>
            <p className="text-xs text-text-muted">
              Restore data from a previously exported backup file.
            </p>

            {showImport && (
              <Card className="p-4 space-y-3">
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportError(null);
                  }}
                  placeholder="Paste JSON backup data here..."
                  className="w-full h-32 p-3 bg-surface border border-border-subtle rounded-lg text-sm font-mono resize-none"
                />
                {importError && (
                  <p className="text-sm text-danger">{importError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleImport}
                    className="flex-1"
                  >
                    Import
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={() => {
                      setShowImport(false);
                      setImportText('');
                      setImportError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

