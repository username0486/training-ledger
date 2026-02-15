// Data recovery screen for handling storage load failures
import { useState } from 'react';
import { Download, Upload, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { TopBar } from './TopBar';
import { Button } from './Button';
import { Card } from './Card';
import { exportData, importData, getRawStoredData, clearAllData } from '../storage/storageGateway';

interface DataRecoveryScreenProps {
  error: string;
  rawData?: string;
  onRecoveryComplete: () => void;
  onReset: () => void;
}

export function DataRecoveryScreen({
  error,
  rawData,
  onRecoveryComplete,
  onReset,
}: DataRecoveryScreenProps) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

    const result = importData(importText, 'replace');
    if (result.success) {
      setImportError(null);
      setImportText('');
      setShowImport(false);
      onRecoveryComplete();
    } else {
      setImportError(result.error || 'Failed to import data');
    }
  };

  const handleAttemptRepair = () => {
    // Try to reload with current raw data
    const currentRaw = getRawStoredData();
    if (currentRaw) {
      const result = importData(currentRaw);
      if (result.success) {
        onRecoveryComplete();
      } else {
        alert(`Repair failed: ${result.error}`);
      }
    } else {
      alert('No raw data available to repair');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone. Make sure you have exported a backup first.')) {
      setIsResetting(true);
      const result = clearAllData();
      if (result.success) {
        onReset();
      } else {
        alert(`Failed to reset: ${result.error}`);
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-panel">
      <TopBar title="Data Recovery" />
      
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Data Load Error</h2>
                <p className="text-text-muted text-sm mb-3">
                  The app encountered an error while loading your data. Your data is safe and has been preserved.
                </p>
                <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle">
                  <p className="text-xs text-text-muted mb-1">Error details:</p>
                  <p className="text-sm font-mono text-text-primary break-all">{error}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold mb-4">Recovery Options</h3>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={handleExport}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Export Backup
              </Button>
              <p className="text-xs text-text-muted">
                Download a backup of your data (including raw stored data if available) before attempting recovery.
              </p>

              <Button
                variant="neutral"
                onClick={handleAttemptRepair}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Attempt Repair
              </Button>
              <p className="text-xs text-text-muted">
                Try to reload the stored data with migration. This may fix minor corruption issues.
              </p>

              <Button
                variant="neutral"
                onClick={() => setShowImport(!showImport)}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2 inline" />
                Import from Backup
              </Button>
              <p className="text-xs text-text-muted">
                Restore data from a previously exported backup file.
              </p>

              {showImport && (
                <div className="space-y-3 pt-3 border-t border-border-subtle">
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
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border-subtle">
                <Button
                  variant="danger"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="w-full"
                >
                  Reset All Data
                </Button>
                <p className="text-xs text-text-muted mt-2">
                  ⚠️ This will permanently delete all your data. Only use this as a last resort after exporting a backup.
                </p>
              </div>
            </div>
          </Card>

          {rawData && (
            <Card className="p-6">
              <h3 className="text-base font-semibold mb-2">Raw Stored Data</h3>
              <p className="text-xs text-text-muted mb-3">
                The raw data that was stored is preserved below. You can copy this for manual recovery.
              </p>
              <textarea
                value={rawData}
                readOnly
                className="w-full h-48 p-3 bg-surface border border-border-subtle rounded-lg text-xs font-mono resize-none"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
