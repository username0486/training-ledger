import { useState, useEffect } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Set } from '../types';
import { formatRelativeTime } from '../utils/storage';
import { formatWeight } from '../../utils/weightFormat';

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

  // Prefill inputs with last set's values ONLY after a set is added (not on initial load)
  useEffect(() => {
    if (sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      setWeight(lastSet.weight.toString());
      setReps(lastSet.reps.toString());
    } else {
      // Clear fields on initial load (no sets yet)
      setWeight('');
      setReps('');
    }
  }, [sets.length]);

  const handleAddSet = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!isNaN(w) && w >= 0 && r > 0) {
      onAddSet(w, r, restTimerElapsed);
      // Prefill with the set we just added (for next set)
      setWeight(w.toString());
      setReps(r.toString());
      // Start rest timer
      setRestTimerStart(Date.now());
    }
  };

  return (
    <div className="h-screen flex flex-col bg-panel">
      <TopBar
        title={exerciseName}
        onBack={() => onBack(restTimerStart)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* Exercise Card */}
          <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{exerciseName}</h2>
            </div>

            {/* Rest Timer or Last Session Info */}
            {restTimerStart !== null && sets.length > 0 ? (
              <div className="flex items-center justify-between px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Since last set</p>
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
              <button
                onClick={() => {
                  // Auto-fill weight from last session (lowest weight)
                  if (lastSession.sets.length > 0) {
                    const lowestWeight = Math.min(...lastSession.sets.map(s => s.weight));
                    setWeight(lowestWeight.toString());
                  }
                }}
                className="w-full px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle text-left hover:bg-surface/70 transition-colors"
              >
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                  Last Session · {formatRelativeTime(lastSession.date)}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {lastSession.sets.map((set, idx) => (
                    <span key={idx} className="text-sm text-text-primary">
                      {formatWeight(set.weight)} × {set.reps}
                    </span>
                  ))}
                </div>
              </button>
            ) : null}

            {/* Set logging inputs - at top for priority */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Weight (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Reps"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleAddSet}
                  disabled={!weight || !reps || parseFloat(weight) <= 0 || parseInt(reps) <= 0}
                  className="flex-1"
                >
                  Add Set
                </Button>
                {sets.length > 0 && (
                  <Button
                    variant="neutral"
                    onClick={onFinish}
                    disabled={sets.length === 0}
                  >
                    <Check className="w-4 h-4 mr-2 inline" />
                    End Exercise
                  </Button>
                )}
              </div>
            </div>

            {/* Sets list - below inputs */}
            {sets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">Sets</p>
                {sets.map((set, index) => (
                  <div
                    key={set.id}
                    className="flex items-center justify-between p-3 bg-panel rounded-lg border border-border-subtle"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-text-muted w-8">#{index + 1}</span>
                      <span className="text-text-primary">
                        {formatWeight(set.weight)} × {set.reps} reps
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteSet(set.id)}
                      className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-surface"
                      title="Delete set"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}