import { useState, useEffect } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Set, Workout } from '../types';
import { formatWeight, convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';
import { RepsWeightGrid } from '../components/RepsWeightGrid';
import { LastSessionStats } from '../components/LastSessionStats';
import { ExerciseHistoryBottomSheet } from '../components/ExerciseHistoryBottomSheet';
import { formatDuration, getElapsedSec } from '../utils/duration';
import { getElapsedSince } from '../utils/restTimer';
import { getSetsInDisplayOrder } from '../utils/setOrdering';
import { getRecentSessionsForExercise } from '../utils/storage';
import { getComparisonFlag } from '../utils/exerciseComparison';

interface ExerciseSessionScreenProps {
  exerciseName: string;
  sets: Set[];
  lastSession?: { sets: Array<{ weight: number; reps: number }>; date: number } | null;
  allWorkouts?: Workout[]; // All workouts for history and comparison
  startedAt?: number;
  endedAt?: number;
  onEnsureStartedAt?: () => void; // ensures startedAt is set + persisted (idempotent)
  lastSetAt?: number; // timestamp of last set (for rest timer)
  onBack: () => void;
  onAddSet: (weight: number, reps: number, restDuration?: number) => void;
  onDeleteSet: (setId: string) => void;
  onFinish: () => void;
}

export function ExerciseSessionScreen({
  exerciseName,
  sets,
  lastSession,
  allWorkouts = [],
  startedAt,
  endedAt,
  onEnsureStartedAt,
  lastSetAt,
  onBack,
  onAddSet,
  onDeleteSet,
  onFinish,
}: ExerciseSessionScreenProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showHistorySheet, setShowHistorySheet] = useState(false);

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

  // Rest timer: compute from lastSetAt timestamp (not stored state)
  // Lightweight tick to trigger re-render for display updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);


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
    
    // Get current rest elapsed before logging set (for restDuration)
    const currentRestElapsed = lastSetAt 
      ? getElapsedSince(lastSetAt)
      : (sets.length > 0 ? getElapsedSince(sets[sets.length - 1].timestamp) : 0);
    onAddSet(wKg, r, currentRestElapsed > 0 ? currentRestElapsed : undefined);
    
    // Prefill with the set we just added (for next set) - keep in display unit
    setWeight(wDisplay.toString());
    setReps(r.toString());
    // lastSetAt will be set by the parent when the set is added
  };

  return (
    <div className="h-screen flex flex-col bg-panel">
      <TopBar
        title={undefined}
        onBack={onBack}
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
          <div className="bg-surface rounded-2xl border border-border-subtle p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{exerciseName}</h2>
            </div>


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
                
                // Get comparison flag
                const comparisonFlag = getComparisonFlag(exerciseName, allWorkouts);
                
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
                    onLabelPress={() => setShowHistorySheet(true)}
                    comparisonFlag={comparisonFlag.show ? comparisonFlag.message : null}
                    showChevron={false}
                  />
                );
              })()}
            </div>

            {/* Sets list - below inputs (only shown when sets exist) */}
            {sets.length > 0 && (() => {
              // Sort sets in chronological order (oldest → newest)
              const sortedSets = getSetsInDisplayOrder(sets);
              return (
                <>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-text-muted">Sets</p>
                    {sortedSets.map((set, index) => (
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
                </>
              );
            })()}
          </div>
        </div>
      </div>
      
      {/* Exercise History Bottom Sheet */}
      <ExerciseHistoryBottomSheet
        isOpen={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        exerciseName={exerciseName}
        sessions={getRecentSessionsForExercise(exerciseName, allWorkouts, 4)}
        onChipPress={(chipWeightKg, chipReps) => {
          // Chip tap prefills draft inputs and closes sheet
          const displayWeight = convertKgToDisplay(chipWeightKg);
          setWeight(displayWeight.toString());
          setReps(chipReps.toString());
          setShowHistorySheet(false);
        }}
      />
    </div>
  );
}