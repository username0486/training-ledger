import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Set } from '../types';
import { CompactBottomSheet } from './CompactBottomSheet';
import { RepsWeightGrid } from './RepsWeightGrid';
import { Button } from './Button';
import { convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';

interface ManageSetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  set: Set | null;
  setIndex: number; // 0-based index for display (#1, #2, etc.)
  onUpdateSet: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
}

/**
 * Compact bottom sheet for editing or deleting a completed set
 * Opens when user taps a set chip
 */
export function ManageSetSheet({
  isOpen,
  onClose,
  exerciseId,
  set,
  setIndex,
  onUpdateSet,
  onDeleteSet,
}: ManageSetSheetProps) {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');

  // Initialize values when set changes
  // Weight is stored in kg (canonical), convert to display unit for input
  useEffect(() => {
    if (set) {
      const displayWeight = convertKgToDisplay(set.weight);
      setWeight(displayWeight.toString());
      setReps(set.reps.toString());
    }
  }, [set]);

  // Reset on close
  useEffect(() => {
    if (!isOpen && set) {
      const displayWeight = convertKgToDisplay(set.weight);
      setWeight(displayWeight.toString());
      setReps(set.reps.toString());
    }
  }, [isOpen, set]);

  if (!set) return null;

  const handleSave = () => {
    const wDisplay = parseFloat(weight);
    const r = parseInt(reps);
    // Allow 0 as valid input
    if (weight === '' || reps === '' || isNaN(wDisplay) || isNaN(r) || wDisplay < 0 || r < 0) {
      return; // Don't save invalid values
    }
    // Convert from display unit to kg (canonical) for storage
    const wKg = convertDisplayToKg(wDisplay);
    onUpdateSet(exerciseId, set.id, wKg, r);
    onClose();
  };

  const handleDelete = () => {
    onDeleteSet(exerciseId, set.id);
    onClose();
  };

  // Compare in display units for change detection
  const currentDisplayWeight = convertKgToDisplay(set.weight);
  const hasChanges = currentDisplayWeight.toString() !== weight || set.reps.toString() !== reps;
  const isValid = weight !== '' && reps !== '' && !isNaN(parseFloat(weight)) && !isNaN(parseInt(reps)) && parseFloat(weight) >= 0 && parseInt(reps) >= 0;

  return (
    <CompactBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Set #${setIndex + 1}`}
    >
      <div className="space-y-4">
        {/* Edit inputs */}
        <RepsWeightGrid
          weight={weight}
          reps={reps}
          onWeightChange={setWeight}
          onRepsChange={setReps}
        />

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {hasChanges && isValid && (
            <Button
              variant="primary"
              onClick={handleSave}
              className="w-full"
            >
              Save changes
            </Button>
          )}
          <Button
            variant="danger"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2 inline" />
            Delete set
          </Button>
        </div>
      </div>
    </CompactBottomSheet>
  );
}
