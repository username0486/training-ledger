import { useState, useEffect } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Set } from '../types';
import { formatWeight, convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';
import { RepsWeightGrid } from '../components/RepsWeightGrid';
import { LastSessionStats } from '../components/LastSessionStats';
import { formatDuration, getElapsedSec } from '../utils/duration';

interface ExerciseSessionScreenProps {
  exerciseName: string;
  sets: Set[];
  lastSession?: { sets: Array<{ weight: number; reps: number }>; date: number } | null;
  startedAt?: number;
  endedAt?: number;
  onEnsureStartedAt?: () => void; // ensures startedAt is set + persisted (idempotent)
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
  startedAt,
  endedAt,
  onEnsureStartedAt,
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

  // Ensure session startedAt is persisted as soon as this screen is active (idempotent)
  useEffect(() => {
    onEnsureStartedAt?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // LIVE header timer (timestamp-based; interval only forces re-render)
  const [timerNow, setTimerNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    if (endedAt) return;
    const id = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  const elapsedSec = startedAt ? getElapsedSec(startedAt, endedAt) : 0;
  const elapsedLabel = formatDuration(elapsedSec);

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
  // Weight is stored in kg (canonical), convert to display unit for input
  useEffect(() => {
    if (sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      const displayWeight = convertKgToDisplay(lastSet.weight);
      setWeight(displayWeight.toString());
      setReps(lastSet.reps.toString());
    } else {
      // Clear fields on initial load (no sets yet)
      setWeight('');
      setReps('');
    }
  }, [sets.length]);

  const handleAddSet = () => {
    const wDisplay = parseFloat(weight);
    const r = parseInt(reps);
    // Allow 0 as valid input (for bodyweight exercises, planks, etc.)
    if (weight === '' || reps === '' || isNaN(wDisplay) || isNaN(r) || wDisplay < 0 || r < 0) return;
    
    // Convert from display unit to kg (canonical) for storage
    const wKg = convertDisplayToKg(wDisplay);
    
    onAddSet(wKg, r, restTimerElapsed);
    // Prefill with the set we just added (for next set) - keep in display unit
    setWeight(wDisplay.toString());
    setReps(r.toString());
    // Start rest timer
    setRestTimerStart(Date.now());
  };

  return (
    <div className="h-screen flex flex-col bg-panel">
      <TopBar
        title={exerciseName}
        onBack={() => onBack(restTimerStart)}
        rightAction={
          startedAt ? (
            <div className="text-sm tabular-nums text-text-muted">
              {elapsedLabel}
            </div>
          ) : null
        }
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
            ) : null}

            {/* Set logging inputs - at top for priority */}
            <div className="space-y-3">
              <RepsWeightGrid
                weight={weight}
                reps={reps}
                onWeightChange={setWeight}
                onRepsChange={setReps}
                weightAutoFocus={true}
              />

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleAddSet}
                  disabled={weight === '' || reps === '' || isNaN(parseFloat(weight)) || isNaN(parseInt(reps)) || parseFloat(weight) < 0 || parseInt(reps) < 0}
                  className="flex-1"
                >
                  Log Set
                </Button>
                {sets.length > 0 && (
                  <Button
                    variant="neutral"
                    onClick={onFinish}
                    disabled={sets.length === 0}
                  >
                    <Check className="w-4 h-4 mr-2 inline" />
                    Done
                  </Button>
                )}
              </div>

              {/* Last session chips - below inputs (only shown when no sets logged yet) */}
              {/* Visibility: ONLY show when exercise has 0 committed sets in current session */}
              {/* Data source: lastSession is strictly from previous completed sessions, never current session */}
              {sets.length === 0 && lastSession && lastSession.sets && lastSession.sets.length > 0 && (() => {
                // Create defensive copy to prevent any mutation
                const lastSessionCopy = {
                  sets: [...lastSession.sets], // Copy array to prevent mutation
                  date: lastSession.date,
                };
                
                return (
                  <LastSessionStats
                    lastSessionData={lastSessionCopy}
                    onChipPress={(chipWeightKg, chipReps) => {
                      // Chip tap only prefills draft inputs - does NOT log a set
                      // Set will only be logged when user taps "Add Set" button
                      // chipWeightKg is in kg (canonical), convert to display unit for input
                      const displayWeight = convertKgToDisplay(chipWeightKg);
                      setWeight(displayWeight.toString());
                      setReps(chipReps.toString());
                    }}
                  />
                );
              })()}
            </div>

            {/* Sets list - below inputs (only shown when sets exist) */}
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