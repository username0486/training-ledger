import { useState, useRef } from 'react';
import { Download, Upload, Trash2, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CompactBottomSheet } from '../components/CompactBottomSheet';
import { Modal } from '../components/Modal';
import { ImportPreviewSheet } from '../components/ImportPreviewSheet';
import {
  exportData,
  importData,
  clearAllData,
  parseImportFile,
  type ImportPreview,
} from '../storage/storageGateway';
import { setLastImportTimestamp } from '../../utils/preferences';

interface BackupsAndDataScreenProps {
  onBack: () => void;
  onDataImported?: () => void;
  onDataDeleted?: () => void;
}

export function BackupsAndDataScreen({ onBack, onDataImported, onDataDeleted }: BackupsAndDataScreenProps) {
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPasteDev, setShowPasteDev] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      toast.error('Failed to export data');
    }
  };

  const handleChooseFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseImportFile(text);
      if (result.success && result.preview && result.state) {
        setImportPreview(result.preview);
        setPendingImportJson(text);
        setImportError(null);
        setShowImport(false);
        setShowPreview(true);
      } else {
        setImportError(result.error || 'Failed to parse file');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportConfirm = (mode: 'merge' | 'replace') => {
    if (!pendingImportJson) return;
    setIsImporting(true);
    const result = importData(pendingImportJson, mode);
    setIsImporting(false);
    if (result.success) {
      setLastImportTimestamp(Date.now());
      setShowPreview(false);
      setPendingImportJson(null);
      setImportPreview(null);
      toast.success('Data imported successfully');
      if (onDataImported) {
        onDataImported();
      }
    } else {
      toast.error(result.error || 'Import failed');
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setImportError('Please paste JSON data');
      return;
    }
    const result = parseImportFile(pasteText);
    if (result.success && result.preview && result.state) {
      setImportPreview(result.preview);
      setPendingImportJson(pasteText);
      setImportError(null);
      setShowPasteDev(false);
      setPasteText('');
      setShowPreview(true);
    } else {
      setImportError(result.error || 'Failed to parse');
    }
  };

  const handleDeleteConfirm = () => {
    const result = clearAllData();
    if (result.success) {
      setShowDeleteConfirm(false);
      if (onDataDeleted) {
        onDataDeleted();
      }
      onBack();
    } else {
      toast.error(result.error || 'Failed to delete data');
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
                  Restore workouts and history from a backup file.
                </p>
              </div>
            </div>
          </Card>

          {/* Delete Data Card */}
          <Card onClick={() => setShowDeleteConfirm(true)} className="cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-surface rounded-lg">
                <Trash2 className="w-5 h-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-text-primary mb-1">
                  Delete data
                </h3>
                <p className="text-sm text-text-muted">
                  Remove all workouts and history from this device.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Import: Choose file */}
      <CompactBottomSheet
        isOpen={showImport}
        onClose={() => {
          setShowImport(false);
          setImportError(null);
        }}
        title="Import backup"
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="primary"
            onClick={handleChooseFile}
            className="w-full"
          >
            <FileUp className="w-4 h-4 mr-2 inline" />
            Choose file
          </Button>
          <p className="text-xs text-text-muted">
            Select a .json backup file exported from Training Ledger.
          </p>
          {importError && (
            <p className="text-sm text-danger">{importError}</p>
          )}
          {import.meta.env.DEV && (
            <>
              <button
                type="button"
                onClick={() => setShowPasteDev(!showPasteDev)}
                className="text-xs text-text-muted underline"
              >
                {showPasteDev ? 'Hide' : 'Show'} paste JSON (dev)
              </button>
              {showPasteDev && (
                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <textarea
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      setImportError(null);
                    }}
                    placeholder="Paste JSON..."
                    className="w-full h-24 p-3 bg-surface border border-border-subtle rounded-lg text-sm font-mono resize-none"
                  />
                  <Button variant="neutral" onClick={handlePasteImport} className="w-full">
                    Parse & preview
                  </Button>
                </div>
              )}
            </>
          )}
          <Button
            variant="neutral"
            onClick={() => {
              setShowImport(false);
              setImportError(null);
            }}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </CompactBottomSheet>

      {/* Import preview */}
      {importPreview && (
        <ImportPreviewSheet
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPendingImportJson(null);
            setImportPreview(null);
          }}
          preview={importPreview}
          onImport={handleImportConfirm}
          isImporting={isImporting}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete all data?"
        actions={
          <>
            <Button variant="neutral" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} className="flex-1">
              <Trash2 className="w-4 h-4 mr-2 inline" />
              Delete
            </Button>
          </>
        }
      >
        <p className="text-text-muted">
          This removes workouts and history from this device. This can't be undone.
        </p>
      </Modal>
    </div>
  );
}
