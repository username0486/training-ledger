import { useState, useEffect } from 'react';
import { Trash2, Check, Clock, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Set } from '../types';
import { formatRelativeTime } from '../utils/storage';

interface ExerciseSessionScreenProps {
  exerciseName: string;
  sets: Set[];
  lastSession?: { sets: Array<{ weight: number; reps: number }>; date: number } | null;
  initialRestTimerStart?: number | null;
  onBack: (restTimerStart: number | null) => void;
  onAddSet: (weight: number, reps: number, restDuration?: number) => void;
  onDeleteSet: (setId: string) => void;
  onFinish: () => void;
  onRestTimerChange?: (restTimerStart: number | null) => void;
}

export function ExerciseSessionScreen({
  exerciseName,
  sets,
  lastSession,
  initialRestTimerStart,
  onBack,
  onAddSet,
  onDeleteSet,
  onFinish,
  onRestTimerChange,
}: ExerciseSessionScreenProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [restTimerStart, setRestTimerStart] = useState<number | null>(initialRestTimerStart || null);
  const [restTimerElapsed, setRestTimerElapsed] = useState(0);

  // Rest timer effect
  useEffect(() => {
    if (restTimerStart === null) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restTimerStart) / 1000);
      setRestTimerElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimerStart]);

  // Emit rest timer changes to parent
  useEffect(() => {
    if (onRestTimerChange) {
      onRestTimerChange(restTimerStart);
    }
  }, [restTimerStart, onRestTimerChange]);

  const handleAddSet = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!isNaN(w) && w >= 0 && r > 0) {
      onAddSet(w, r, restTimerElapsed);
      // Keep weight and reps values for next set
      // Only clear reps field to allow user to adjust for drop sets
      setReps('');
      // Start rest timer
      setRestTimerStart(Date.now());
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={exerciseName}
        onBack={() => onBack(restTimerStart)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5">
          <Card gradient className="space-y-4">
            {/* Rest Timer or Last Session */}
            {restTimerStart !== null && sets.length > 0 ? (
              <div className="flex items-center justify-between px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Rest</p>
                    <p className="text-lg tabular-nums">
                      {Math.floor(restTimerElapsed / 60)}:{(restTimerElapsed % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRestTimerStart(null);
                    setRestTimerElapsed(0);
                  }}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : lastSession ? (
              <div className="text-text-muted px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle">
                <p className="text-xs uppercase tracking-wide mb-1">Last time · {formatRelativeTime(lastSession.date)}</p>
                <div className="flex gap-3 flex-wrap">
                  {lastSession.sets.map((set, idx) => (
                    <span key={idx} className="text-sm">
                      {set.weight} kg × {set.reps}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Logged sets */}
            {sets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">Sets</p>
                {sets.map((set, index) => (
                  <div
                    key={set.id}
                    className="flex items-center justify-between p-3 bg-surface rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-text-muted w-6">#{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span>{set.weight} kg</span>
                        <span className="text-text-muted">×</span>
                        <span>{set.reps} reps</span>
                        {set.restDuration !== undefined && set.restDuration > 0 && (
                          <>
                            <span className="text-text-muted/40">·</span>
                            <span className="text-text-muted/60 text-sm tabular-nums">
                              {Math.floor(set.restDuration / 60)}:{(set.restDuration % 60).toString().padStart(2, '0')} rest
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteSet(set.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add set inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Weight (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min={0}
                  step={0.5}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Reps"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  min={1}
                  step={1}
                />
              </div>
              {sets.length > 0 ? (
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleAddSet}
                    className="flex-1"
                    disabled={weight === '' || reps === '' || parseInt(reps) <= 0}
                  >
                    Add Set
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={onFinish}
                    className="flex-shrink-0"
                  >
                    <Check className="w-4 h-4 mr-2 inline" />
                    End Exercise
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleAddSet}
                  className="w-full"
                  disabled={weight === '' || reps === '' || parseInt(reps) <= 0}
                >
                  Add Set
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}