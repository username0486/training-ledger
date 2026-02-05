import { useState, useRef } from 'react';
import { Download, Upload, Trash2, ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CompactBottomSheet } from '../components/CompactBottomSheet';
import { exportData, importData, clearAllData } from '../storage/storageGateway';

interface BackupsAndDataScreenProps {
  onBack: () => void;
  onDataImported?: () => void;
  onDataDeleted?: () => void;
}

export function BackupsAndDataScreen({ onBack, onDataImported, onDataDeleted }: BackupsAndDataScreenProps) {
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isHoldingDelete, setIsHoldingDelete] = useState(false);
  const deleteHoldTimeoutRef = useRef<number | null>(null);
  const deleteHoldStartRef = useRef<number | null>(null);

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

  const handleDeleteHoldStart = () => {
    setIsHoldingDelete(true);
    const startTime = Date.now();
    deleteHoldStartRef.current = startTime;
    
    // Require 2 seconds of holding
    deleteHoldTimeoutRef.current = window.setTimeout(() => {
      // Check if we're still holding and enough time has passed
      if (deleteHoldStartRef.current && Date.now() - deleteHoldStartRef.current >= 2000) {
        setShowDeleteConfirm(true);
        setIsHoldingDelete(false);
      }
    }, 2000);
  };

  const handleDeleteHoldEnd = () => {
    setIsHoldingDelete(false);
    if (deleteHoldTimeoutRef.current) {
      clearTimeout(deleteHoldTimeoutRef.current);
      deleteHoldTimeoutRef.current = null;
    }
    deleteHoldStartRef.current = null;
  };

  const handleDeleteConfirm = () => {
    const result = clearAllData();
    if (result.success) {
      setShowDeleteConfirm(false);
      if (onDataDeleted) {
        onDataDeleted();
      }
      // Return to settings after deletion
      onBack();
    } else {
      alert(`Failed to delete data: ${result.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Backups & data" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Export Data Card */}
          <Card onClick={handleExport} className="cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-surface rounded-lg">
                <Download className="w-5 h-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-text-primary mb-1">
                  Export data
                </h3>
                <p className="text-sm text-text-muted">
                  Save a backup of your workouts and history.
                </p>
              </div>
            </div>
          </Card>

          {/* Import Data Card */}
          <Card onClick={() => setShowImport(true)} className="cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-surface rounded-lg">
                <Upload className="w-5 h-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-text-primary mb-1">
                  Import data
                </h3>
                <p className="text-sm text-text-muted">
                  Restore workouts and history from a backup.
                </p>
              </div>
            </div>
          </Card>

          {/* Delete Data Card */}
          <Card 
            onMouseDown={handleDeleteHoldStart}
            onMouseUp={handleDeleteHoldEnd}
            onMouseLeave={handleDeleteHoldEnd}
            onTouchStart={handleDeleteHoldStart}
            onTouchEnd={handleDeleteHoldEnd}
            className={`cursor-pointer transition-colors ${
              isHoldingDelete ? 'bg-danger/10 border-danger/30' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg transition-colors ${
                isHoldingDelete ? 'bg-danger/20' : 'bg-surface'
              }`}>
                <Trash2 className={`w-5 h-5 transition-colors ${
                  isHoldingDelete ? 'text-danger' : 'text-text-primary'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-medium mb-1 transition-colors ${
                  isHoldingDelete ? 'text-danger' : 'text-text-primary'
                }`}>
                  Delete data
                </h3>
                <p className="text-sm text-text-muted">
                  {isHoldingDelete 
                    ? 'Keep holding to confirm...' 
                    : 'Remove all workouts and history from this device.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Import Bottom Sheet */}
      <CompactBottomSheet
        isOpen={showImport}
        onClose={() => {
          setShowImport(false);
          setImportText('');
          setImportError(null);
        }}
        title="Import backup"
      >
        <div className="space-y-4">
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
              disabled={!importText.trim()}
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
        </div>
      </CompactBottomSheet>

      {/* Delete Confirmation Bottom Sheet */}
      <CompactBottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete all data?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This removes workouts and history from this device. This can't be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2 inline" />
              Delete
            </Button>
            <Button
              variant="neutral"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CompactBottomSheet>
    </div>
  );
}
