import { useState } from 'react';
import { CompactBottomSheet } from './CompactBottomSheet';
import { Button } from './Button';
import { Input } from './Input';
import type { ImportPreview } from '../storage/importHelpers';

const REPLACE_CONFIRM = 'REPLACE';

interface ImportPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  preview: ImportPreview;
  onImport: (mode: 'merge' | 'replace') => void;
  isImporting?: boolean;
}

export function ImportPreviewSheet({
  isOpen,
  onClose,
  preview,
  onImport,
  isImporting = false,
}: ImportPreviewSheetProps) {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [replaceConfirm, setReplaceConfirm] = useState('');

  const canReplace = replaceConfirm === REPLACE_CONFIRM;
  const schemaLabel =
    preview.detectedVersion === 'legacy'
      ? 'Legacy (migrated)'
      : preview.detectedVersion === 'current'
        ? `v${preview.schemaVersion}`
        : `v${preview.detectedVersion} → v${preview.schemaVersion}`;

  const handleImport = () => {
    if (mode === 'replace' && !canReplace) return;
    onImport(mode);
  };

  const handleClose = () => {
    setMode('merge');
    setReplaceConfirm('');
    onClose();
  };

  return (
    <CompactBottomSheet isOpen={isOpen} onClose={handleClose} title="Import preview">
      <div className="space-y-4">
        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle">
            <p className="text-xs text-text-muted uppercase tracking-wide">Workouts</p>
            <p className="text-xl font-semibold tabular-nums">{preview.workouts}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle">
            <p className="text-xs text-text-muted uppercase tracking-wide">Exercises</p>
            <p className="text-xl font-semibold tabular-nums">{preview.exercises}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle">
            <p className="text-xs text-text-muted uppercase tracking-wide">Sessions</p>
            <p className="text-xl font-semibold tabular-nums">{preview.sessions}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle">
            <p className="text-xs text-text-muted uppercase tracking-wide">Sets</p>
            <p className="text-xl font-semibold tabular-nums">{preview.sets}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 border border-border-subtle col-span-2">
            <p className="text-xs text-text-muted uppercase tracking-wide">Templates</p>
            <p className="text-xl font-semibold tabular-nums">{preview.templates}</p>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Schema: {schemaLabel}
        </p>

        {/* Import mode */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">Import mode</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('merge')}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                mode === 'merge'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border-subtle bg-surface/50 text-text-muted hover:bg-surface'
              }`}
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                mode === 'replace'
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'border-border-subtle bg-surface/50 text-text-muted hover:bg-surface'
              }`}
            >
              Replace
            </button>
          </div>
          <p className="text-xs text-text-muted">
            {mode === 'merge'
              ? 'Add new data. Duplicates keep the newest version.'
              : 'Replace all data. Type REPLACE to confirm.'}
          </p>
        </div>

        {mode === 'replace' && (
          <div className="space-y-2">
            <label className="text-sm text-text-muted">
              Type <span className="font-mono font-semibold text-danger">REPLACE</span> to confirm
            </label>
            <Input
              value={replaceConfirm}
              onChange={(e) => setReplaceConfirm(e.target.value.toUpperCase())}
              placeholder="REPLACE"
              className="font-mono"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            onClick={handleImport}
            className="flex-1"
            disabled={isImporting || (mode === 'replace' && !canReplace)}
          >
            {isImporting ? 'Importing…' : 'Import'}
          </Button>
          <Button variant="neutral" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
        </div>
      </div>
    </CompactBottomSheet>
  );
}
