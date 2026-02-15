import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { FullScreenSearchLayout } from '../components/FullScreenSearchLayout';
import { ExerciseSearchInput } from '../components/ExerciseSearchInput';
import { ExerciseList } from '../components/ExerciseList';
import { Pill } from '../components/Pill';
import { Button } from '../components/Button';
import { AdHocLoggingSession } from '../types';
import { getAllExercisesList, addExerciseToDb, ExerciseDBEntry } from '../../utils/exerciseDb';
import { searchExercisesWithIntent } from '../../utils/exerciseDb/intentSearch';
import { getRecentExercisesWithUsage } from '../../utils/exerciseRecents';
import { getUsageStats } from '../../utils/exerciseUsageStats';
import { updateSessionClassificationAndName } from '../utils/sessionNaming';

interface StartLoggingScreenProps {
  session: AdHocLoggingSession | null;
  onBack: () => void;
  onAddExercise: (exerciseName: string) => void;
  onRemoveExercise: (exerciseInstanceId: string) => void;
  /** Call with optional session when create+add flow provides the updated session before navigation */
  onEnterSession: (session?: AdHocLoggingSession) => void;
  onUpdateSession: (session: AdHocLoggingSession | null) => void;
}

/** Ordered selection: first selected first (for workout order) */
type SelectionItem = { exerciseId: string; name: string };

export function StartLoggingScreen({
  session,
  onBack,
  onAddExercise,
  onRemoveExercise,
  onEnterSession,
  onUpdateSession,
}: StartLoggingScreenProps) {
  const [allExercises, setAllExercises] = useState<ExerciseDBEntry[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Selection state: ordered list, deduped by exerciseId
  const [selection, setSelection] = useState<SelectionItem[]>([]);
  const selectionIdsSet = useMemo(() => new Set(selection.map((s) => s.exerciseId)), [selection]);
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const [showChipsScroll, setShowChipsScroll] = useState(true);

  // Only show horizontal scroll when overflow is substantial (> ~25% of a pill width)
  useEffect(() => {
    const el = chipsScrollRef.current;
    if (!el || selection.length === 0) return;

    const check = () => {
      const overflow = el.scrollWidth - el.clientWidth;
      const threshold = 28; // ~25% of typical pill width (80–120px)
      setShowChipsScroll(overflow > threshold);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selection]);

  // Load all exercises on mount
  useEffect(() => {
    setAllExercises(getAllExercisesList());
  }, []);

  const toggleSelection = (exercise: ExerciseDBEntry) => {
    const id = exercise.id;
    const name = exercise.name;
    setSelection((prev) => {
      const idx = prev.findIndex((s) => s.exerciseId === id);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { exerciseId: id, name }];
    });
  };

  const removeFromSelection = (exerciseId: string) => {
    setSelection((prev) => prev.filter((s) => s.exerciseId !== exerciseId));
  };

  const handleSelectExercise = (exercise: ExerciseDBEntry) => {
    toggleSelection(exercise);
  };

  const handleCreateAndAdd = (query: string) => {
    const trimmed = query.trim();
    setCreateError(null);

    if (trimmed.length < 2) {
      setCreateError('Enter at least 2 characters');
      return;
    }

    let exercise: ExerciseDBEntry;
    try {
      exercise = addExerciseToDb(trimmed);
    } catch (err) {
      toast.error('Could not save exercise. Try again.');
      return;
    }

    // Add to selection (as if tapped)
    setSelection((prev) => {
      if (prev.some((s) => s.exerciseId === exercise.id)) return prev;
      return [...prev, { exerciseId: exercise.id, name: exercise.name }];
    });

    // Refresh list so new exercise appears
    setAllExercises(getAllExercisesList());
  };

  const handleStart = () => {
    if (selection.length === 0) return;

    const now = Date.now();
    const sessionId = session?.id || `session-${now}`;

    const exercises = selection.map((item, idx) => {
      const exerciseInstanceId = `${sessionId}-ex-${now}-${idx}-${Math.random()}`;
      const dbEx = allExercises.find((e) => e.id === item.exerciseId);
      const source = (dbEx?.source === 'user' ? 'user' : 'system') as 'user' | 'system';
      return {
        id: exerciseInstanceId,
        exerciseId: item.exerciseId,
        name: item.name,
        source,
        addedAt: now,
        sets: [] as any[],
        isComplete: false,
      };
    });

    const newSession: AdHocLoggingSession = {
      id: sessionId,
      createdAt: session?.createdAt ?? now,
      status: 'active',
      exerciseOrder: exercises.map((e) => e.id),
      exercises,
      startTime: now,
      startedAt: now,
    };

    const reclassified = updateSessionClassificationAndName(newSession, exercises.length);
    onUpdateSession(reclassified);
    setSelection([]);
    onEnterSession(reclassified);
  };

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const recentExercises = useMemo(() => {
    if (searchTerm.trim()) return [];
    return getRecentExercisesWithUsage(
      allExercises,
      5,
      (exerciseId) => {
        const stats = getUsageStats(exerciseId);
        if (!stats) return null;
        return { useCount: stats.useCount, lastUsedAt: stats.lastUsedAt };
      }
    );
  }, [allExercises, searchTerm]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return { matches: [], related: [] };
    const results = searchExercisesWithIntent(allExercises, searchTerm);
    return {
      matches: Array.isArray(results?.matches) ? results.matches : [],
      related: Array.isArray(results?.related) ? results.related : [],
    };
  }, [searchTerm, allExercises]);

  // Case-insensitive: does query match any existing exercise?
  const hasExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return allExercises.some((ex) => ex.name.toLowerCase() === q);
  }, [allExercises, searchTerm]);

  const showCreateAndAdd = searchTerm.trim() !== '' && !hasExactMatch;
  const isEmptyQuery = !searchTerm.trim();
  const hasSearchResults = searchResults.matches.length > 0 || searchResults.related.length > 0;
  const hasRecents = recentExercises.length > 0;

  const startLabel =
    selection.length === 0
      ? 'Start'
      : selection.length === 1
        ? `Start ${selection[0].name}`
        : 'Start workout';

  const chipsRow =
    selection.length > 0 ? (
      <div
        ref={chipsScrollRef}
        className={`py-2.5 px-5 bg-surface/30 ${showChipsScroll ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
      >
        <div className="flex gap-1.5 min-w-min">
          {selection.map((item) => (
            <Pill key={item.exerciseId} variant="accent" className="text-xs py-0.5 px-2 group flex-shrink-0">
              <span className="pr-1">{item.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromSelection(item.exerciseId);
                }}
                className="ml-0.5 hover:bg-accent/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${item.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Pill>
          ))}
        </div>
      </div>
    ) : undefined;

  const results = (
    <>
      {showCreateAndAdd && (
        <div className="mb-4 space-y-1">
          <Button
            variant="neutral"
            onClick={() => handleCreateAndAdd(searchTerm.trim())}
            className="w-full"
          >
            Create and add &quot;{searchTerm.trim()}&quot;
          </Button>
          {createError && <p className="text-sm text-danger">{createError}</p>}
        </div>
      )}
      {isEmptyQuery ? (
            hasRecents ? (
              <ExerciseList
                exercises={recentExercises}
                onSelect={handleSelectExercise}
                selectedExerciseIds={selectionIdsSet}
                mode="MULTI_SELECT_TOGGLE"
                showDetails={true}
                showSecondaryMuscles={false}
                showCategory={false}
                emptyMessage=""
              />
            ) : (
              <div className="py-8 text-center text-text-muted">
                <p className="text-sm">Start typing to search exercises</p>
              </div>
            )
          ) : hasSearchResults ? (
            <>
              {searchResults.matches.length > 0 && (
                <ExerciseList
                  exercises={searchResults.matches}
                  onSelect={handleSelectExercise}
                  selectedExerciseIds={selectionIdsSet}
                  mode="MULTI_SELECT_TOGGLE"
                  showDetails={true}
                  showSecondaryMuscles={true}
                  showCategory={true}
                  emptyMessage=""
                />
              )}
              {searchResults.related.length > 0 && searchResults.matches.length > 0 && (
                <div className="py-2">
                  <div className="h-px bg-border-subtle" />
                </div>
              )}
              {searchResults.related.length > 0 && (
                <ExerciseList
                  exercises={searchResults.related}
                  onSelect={handleSelectExercise}
                  selectedExerciseIds={selectionIdsSet}
                  mode="MULTI_SELECT_TOGGLE"
                  showDetails={true}
                  showSecondaryMuscles={true}
                  showCategory={true}
                  emptyMessage=""
                />
              )}
            </>
      ) : (
        <div className="py-8 text-center text-text-muted">
          <p className="text-sm">No exercises found</p>
        </div>
      )}
    </>
  );

  const bottomCta = (
    <Button
      variant="primary"
      onClick={handleStart}
      disabled={selection.length === 0}
      className="w-full"
    >
      {startLabel}
    </Button>
  );

  return (
    <FullScreenSearchLayout
      title="Start logging"
      onBack={onBack}
      navVisible={false}
      searchInput={
        <ExerciseSearchInput
          ref={inputRef}
          value={searchTerm}
          onChange={(v) => {
            setSearchTerm(v);
            if (createError) setCreateError(null);
          }}
          placeholder="Search exercises..."
          autoFocus={true}
        />
      }
      chipsRow={chipsRow}
      results={results}
      bottomCta={bottomCta}
    />
  );
}
