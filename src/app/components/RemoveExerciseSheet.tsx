import { useState } from 'react';
import { ExerciseSearchBottomSheet } from './ExerciseSearchBottomSheet';
import { Exercise } from '../types';
import { Button } from './Button';
import { Check } from 'lucide-react';

interface RemoveExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: Exercise[];
  onConfirm: (exerciseIdsToRemove: string[]) => void;
}

export function RemoveExerciseSheet({
  isOpen,
  onClose,
  groupMembers,
  onConfirm,
}: RemoveExerciseSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(groupMembers.map(ex => ex.id))
  );

  const handleToggle = (exerciseId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        // Don't allow unchecking if it's the last one
        if (next.size > 1) {
          next.delete(exerciseId);
        }
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const idsToRemove = Array.from(selectedIds);
    onConfirm(idsToRemove);
    onClose();
  };

  return (
    <ExerciseSearchBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Remove exercise"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Select exercises to remove from the superset. At least one exercise must remain.
        </p>

        <div className="space-y-2">
          {groupMembers.map((exercise) => {
            const isSelected = selectedIds.has(exercise.id);
            const isLastOne = selectedIds.size === 1 && isSelected;

            return (
              <label
                key={exercise.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-surface/50 border-border-subtle'
                    : 'bg-surface/20 border-border-subtle/50'
                } ${isLastOne ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(exercise.id)}
                  disabled={isLastOne}
                  className="w-4 h-4 rounded border-border-subtle"
                />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{exercise.name}</p>
                  {exercise.sets.length > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''} logged
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="neutral"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2 inline" />
            Remove
          </Button>
        </div>
      </div>
    </ExerciseSearchBottomSheet>
  );
}
