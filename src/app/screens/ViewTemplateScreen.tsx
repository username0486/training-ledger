import { useState } from 'react';
import { Play, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';

interface ViewTemplateScreenProps {
  template: WorkoutTemplate;
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  onBack: () => void;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ViewTemplateScreen({
  template,
  lastSessionData,
  onBack,
  onStart,
  onEdit,
  onDelete,
}: ViewTemplateScreenProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={template.name}
        onBack={onBack}
        rightAction={
          <button
            onClick={onEdit}
            className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text-primary"
          >
            <Pencil className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Exercise list */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-text-muted px-1">
              Exercises ({template.exerciseNames.length})
            </p>
            {template.exerciseNames.map((exercise, index) => {
              const lastSession = lastSessionData.get(exercise);
              return (
                <Card key={`${exercise}-${index}`} gradient>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted w-6">#{index + 1}</span>
                      <span className="flex-1">{exercise}</span>
                    </div>
                    {lastSession && (
                      <div className="ml-9 text-text-muted">
                        <p className="text-xs mb-1">
                          Last session · {formatTimeAgo(lastSession.date)}
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {lastSession.sets.map((set, idx) => (
                            <span key={idx} className="text-xs">
                              {set.weight} kg × {set.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button
              variant="primary"
              onClick={onStart}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2 inline" />
              Start Workout
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2 inline" />
              Delete Workout
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <Card className="max-w-sm w-full">
            <h3 className="mb-2">Delete workout?</h3>
            <p className="text-text-muted mb-6">
              This will permanently delete "{template.name}". This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="neutral"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}