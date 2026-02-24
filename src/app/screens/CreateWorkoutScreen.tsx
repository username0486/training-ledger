import React, { useState, useMemo } from 'react';
import { Plus, Trash2, GripVertical, Dumbbell } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { ExerciseSearchScreen } from './ExerciseSearchScreen';
import { addExerciseToDb } from '../utils/exerciseDb';
import { ExerciseReorderAndGroupList } from '../../components/drag/ExerciseReorderAndGroupList';
import type { ExerciseItem, SessionListItem } from '../../components/drag/exerciseDnDUtils';
import { flattenToNames } from '../../components/drag/exerciseDnDUtils';
import { GroupLinkChip } from '../components/GroupLinkChip';
import {
  estimateWorkoutDuration,
  formatDurationRange,
  type EstimationExercise,
} from '../utils/duration';

function createExerciseItems(names: string[]): ExerciseItem[] {
  return names.map((name, i) => ({ type: 'exercise' as const, id: `ex-create-${i}-${name}-${Date.now()}`, name }));
}

function itemsToEstimationExercises(items: SessionListItem[]): EstimationExercise[] {
  const result: EstimationExercise[] = [];
  for (const item of items) {
    if (item.type === 'exercise') {
      result.push({ setCount: 3, groupId: null });
    } else {
      for (const _ of item.children) {
        result.push({ setCount: 3, groupId: item.id });
      }
    }
  }
  return result;
}

interface CreateWorkoutScreenProps {
  initialName?: string;
  initialExercises?: string[];
  onSave: (name: string, exercises: string[]) => void;
  onDiscard: () => void;
}

export function CreateWorkoutScreen({
  initialName = '',
  initialExercises = [],
  onSave,
  onDiscard,
}: CreateWorkoutScreenProps) {
  const [workoutName, setWorkoutName] = useState(initialName);
  const [items, setItems] = useState<SessionListItem[]>(() =>
    createExerciseItems(initialExercises)
  );
  const [showAddExercise, setShowAddExercise] = useState(false);

  const exercises = useMemo(() => flattenToNames(items), [items]);
  const durationEstimate = useMemo(
    () =>
      estimateWorkoutDuration('create', itemsToEstimationExercises(items), [], undefined),
    [items]
  );

  const handleAddExercise = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !exercises.includes(trimmedName)) {
      try {
        addExerciseToDb(trimmedName);
      } catch {
        // Exercise might already exist
      }
      setItems((prev) => [
        ...prev,
        { type: 'exercise' as const, id: `ex-add-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: trimmedName },
      ]);
      setShowAddExercise(false);
    }
  };

  const handleAddNewExercise = (name: string) => {
    try {
      addExerciseToDb(name);
    } catch {
      // Might already exist
    }
    handleAddExercise(name);
  };

  const handleRemoveExercise = (item: ExerciseItem) => {
    setItems((prev) => prev.filter((i) => i.type === 'exercise' && i.id !== item.id));
  };

  const handleSave = () => {
    if (workoutName.trim() && exercises.length > 0) {
      onSave(workoutName.trim(), exercises);
    }
  };

  const canSave = workoutName.trim() !== '' && exercises.length > 0;

  if (showAddExercise) {
    return (
      <ExerciseSearchScreen
        title="Add Exercise"
        onBack={() => setShowAddExercise(false)}
        onSelectExercise={handleAddExercise}
        onAddNewExercise={handleAddNewExercise}
        selectedExercises={exercises}
        placeholder="Search exercises..."
        autoFocus={true}
        showDetails={true}
        createButtonLabel="Create & add"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <TopBar
        title="Create Workout"
        onBack={onDiscard}
        rightAction={
          <Button 
            size="sm" 
            variant="primary" 
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </Button>
        }
      />

      <div className="flex-1 overflow-x-hidden overflow-y-auto min-w-0">
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Workout name */}
          <FloatingLabelInput
            label="Workout name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            autoFocus={!initialName}
            icon={<Dumbbell />}
          />

          {/* Exercise list */}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No exercises yet</p>
              <Button variant="primary" onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Exercises ({items.length})
                </p>
                {durationEstimate && (
                  <p className="text-xs text-text-muted">
                    Est. {formatDurationRange(durationEstimate.minSec, durationEstimate.maxSec)}
                  </p>
                )}
              </div>
              <ExerciseReorderAndGroupList
                items={items}
                onChange={setItems}
                enableGrouping={true}
                renderExerciseRow={(item, { dragHandleProps, isDragging }) => (
                  <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border transition-all">
                    <div {...dragHandleProps} className="flex-shrink-0 touch-none">
                      <GripVertical className="w-5 h-5 text-text-muted" />
                    </div>
                    <span className="flex-1">{item.name}</span>
                    <button
                      onClick={() => handleRemoveExercise(item)}
                      className="p-1.5 rounded-lg hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                renderGroupRow={(group, _ctx, { children }) => (
                    <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <GroupLinkChip childrenCount={group.children.length} />
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-border">{children}</div>
                    </div>
                  )}
              />
              <Button
                variant="neutral"
                onClick={() => setShowAddExercise(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}