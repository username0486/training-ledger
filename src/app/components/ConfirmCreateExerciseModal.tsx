import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { getAllExercisesList } from '../utils/exerciseDb';
import { normalizeExerciseName } from '../../utils/exerciseDb/types';

interface ConfirmCreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onCreate: (name: string) => void;
  createButtonLabel?: string; // e.g., "Create & start" or "Create & add"
}

/**
 * Lightweight confirmation modal for creating a new exercise
 * Prevents typos by allowing name editing before creation
 */
export function ConfirmCreateExerciseModal({
  isOpen,
  onClose,
  initialName,
  onCreate,
  createButtonLabel = 'Create & start',
}: ConfirmCreateExerciseModalProps) {
  const [exerciseName, setExerciseName] = useState(initialName);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Reset name when modal opens/closes or initialName changes
  useEffect(() => {
    if (isOpen) {
      setExerciseName(initialName);
      setIsDuplicate(false);
    }
  }, [isOpen, initialName]);

  // Check for duplicates as user types
  useEffect(() => {
    if (!isOpen || !exerciseName.trim()) {
      setIsDuplicate(false);
      return;
    }

    const normalizedInput = normalizeExerciseName(exerciseName);
    const allExercises = getAllExercisesList();
    const duplicate = allExercises.find(
      ex => normalizeExerciseName(ex.name) === normalizedInput
    );

    setIsDuplicate(!!duplicate);
  }, [exerciseName, isOpen]);

  const handleCreate = () => {
    const trimmedName = exerciseName.trim();
    if (!trimmedName) return;

    // Check for duplicate one more time before creating
    const normalizedInput = normalizeExerciseName(trimmedName);
    const allExercises = getAllExercisesList();
    const existingExercise = allExercises.find(
      ex => normalizeExerciseName(ex.name) === normalizedInput
    );

    if (existingExercise) {
      // Select existing exercise instead of creating duplicate
      onCreate(existingExercise.name);
      onClose();
      return;
    }

    // Create new exercise
    onCreate(trimmedName);
    onClose();
  };

  const handleCancel = () => {
    setExerciseName(initialName);
    setIsDuplicate(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Create exercise"
    >
      <div className="space-y-4">
        <div>
          <Input
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="Exercise name"
            autoFocus
            className="w-full"
          />
          {isDuplicate && (
            <p className="text-xs text-text-muted mt-2">
              An exercise with this name already exists. It will be selected instead of creating a duplicate.
            </p>
          )}
          <p className="text-xs text-text-muted mt-2">
            Details optional. You can add them later.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="neutral"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            className="flex-1"
            disabled={!exerciseName.trim()}
          >
            {createButtonLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

