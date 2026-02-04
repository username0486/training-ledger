import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { ExerciseSearchInput } from '../components/ExerciseSearchInput';
import { ExerciseList } from '../components/ExerciseList';
import { Pill } from '../components/Pill';
import { Button } from '../components/Button';
import { AdHocLoggingSession } from '../types';
import { getAllExercisesList, ExerciseDBEntry } from '../../utils/exerciseDb';
import { normalizeExerciseName } from '../../utils/exerciseDb/types';
import { searchExercisesWithIntent } from '../../utils/exerciseDb/intentSearch';
import { getRecentExercisesWithUsage } from '../../utils/exerciseRecents';
import { getUsageStats } from '../../utils/exerciseUsageStats';
import { updateSessionClassificationAndName } from '../utils/sessionNaming';

interface StartLoggingScreenProps {
  session: AdHocLoggingSession | null;
  onBack: () => void;
  onAddExercise: (exerciseName: string) => void;
  onRemoveExercise: (exerciseInstanceId: string) => void;
  onEnterSession: () => void;
  onUpdateSession: (session: AdHocLoggingSession | null) => void;
}

export function StartLoggingScreen({
  session,
  onBack,
  onAddExercise,
  onRemoveExercise,
  onEnterSession,
  onUpdateSession,
}: StartLoggingScreenProps) {
  const [allExercises, setAllExercises] = useState<ExerciseDBEntry[]>([]);
  const [showAddedFeedback, setShowAddedFeedback] = useState<{ name: string; isDuplicate: boolean } | null>(null);

  // Load all exercises on mount
  useEffect(() => {
    const exercises = getAllExercisesList();
    setAllExercises(exercises);
  }, []);

  // Get exercise names currently in session
  const loggedExerciseNames = session?.exercises.map(ex => ex.name) || [];
  const loggedExerciseIds = session?.exercises.map(ex => ex.exerciseId) || [];

  const handleSelectExercise = (exerciseName: string) => {
    // Check if exercise is already in session (prevent duplicates)
    const isDuplicate = loggedExerciseIds.some(id => {
      const ex = allExercises.find(e => e.id === id);
      return ex && normalizeExerciseName(ex.name) === normalizeExerciseName(exerciseName);
    });
    
    if (isDuplicate) {
      // Show feedback that it's already added
      setShowAddedFeedback({ name: exerciseName, isDuplicate: true });
      setTimeout(() => setShowAddedFeedback(null), 2000);
      return;
    }

    // Find exercise in DB to get ID and source
    const exercise = allExercises.find(
      ex => normalizeExerciseName(ex.name) === normalizeExerciseName(exerciseName)
    );

    if (!exercise) return;

    // Create or update session
    const now = Date.now();
    const exerciseInstanceId = `${session?.id || `session-${now}`}-ex-${now}-${Math.random()}`;
    
    const newSession: AdHocLoggingSession = session || {
      id: `session-${now}`,
      createdAt: now,
      status: 'active',
      exerciseOrder: [],
      exercises: [],
      startTime: now,
    };

    const updatedSession: AdHocLoggingSession = {
      ...newSession,
      exerciseOrder: [...newSession.exerciseOrder, exerciseInstanceId],
      exercises: [
        ...newSession.exercises,
        {
          id: exerciseInstanceId,
          exerciseId: exercise.id,
          name: exercise.name,
          source: exercise.source,
          addedAt: now,
          sets: [],
          isComplete: false,
        },
      ],
    };

    // Update classification and name when exercises change
    const exerciseCount = updatedSession.exercises.length;
    const reclassifiedSession = updateSessionClassificationAndName(updatedSession, exerciseCount);
    onUpdateSession(reclassifiedSession);
    onAddExercise(exerciseName);

    // Show brief feedback
    setShowAddedFeedback({ name: exerciseName, isDuplicate: false });
    setTimeout(() => setShowAddedFeedback(null), 1500);
  };

  const handleAddNewExercise = (exerciseName: string) => {
    // Same as handleSelectExercise - add to session
    handleSelectExercise(exerciseName);
  };

  const handleRemoveExercise = (exerciseInstanceId: string) => {
    if (!session) return;

    const updatedSession: AdHocLoggingSession = {
      ...session,
      exerciseOrder: session.exerciseOrder.filter(id => id !== exerciseInstanceId),
      exercises: session.exercises.filter(ex => ex.id !== exerciseInstanceId),
    };

    // If no exercises left, clear the session
    if (updatedSession.exercises.length === 0) {
      onUpdateSession(null);
    } else {
      // Update classification and name when exercises change
      const exerciseCount = updatedSession.exercises.length;
      const reclassifiedSession = updateSessionClassificationAndName(updatedSession, exerciseCount);
      onUpdateSession(reclassifiedSession);
    }

    onRemoveExercise(exerciseInstanceId);
  };

  // Get button label
  const firstExercise = session?.exercises[0];
  const exerciseCount = session?.exercises.length || 0;
  const buttonLabel = firstExercise
    ? (exerciseCount > 1 
        ? 'Log workout' 
        : `Log ${firstExercise.name}`)
    : '';

  const handleStartLogging = () => {
    if (session && session.exercises.length > 0) {
      onEnterSession();
    }
  };

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Get recent exercises for default state
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

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return { matches: [], related: [] };
    }
    const results = searchExercisesWithIntent(allExercises, searchTerm);
    return {
      matches: Array.isArray(results?.matches) ? results.matches : [],
      related: Array.isArray(results?.related) ? results.related : [],
    };
  }, [searchTerm, allExercises]);

  // Check for exact match
  const exactMatch = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const trimmed = searchTerm.trim().toLowerCase();
    return allExercises.find(ex => ex.name.toLowerCase() === trimmed) || null;
  }, [allExercises, searchTerm]);

  const showAddNew = searchTerm.trim() !== '' && !exactMatch;
  const isEmptyQuery = !searchTerm.trim();
  const hasSearchResults = searchResults.matches.length > 0 || searchResults.related.length > 0;
  const hasRecents = recentExercises.length > 0;

  return (
    <ExerciseSearchBottomSheet
      isOpen={true}
      onClose={onBack}
      title="Start logging"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Pinned search bar - always visible at top */}
        <div className="flex-shrink-0 pb-4 border-b border-border-subtle -mx-6 px-6">
          <ExerciseSearchInput
            ref={inputRef}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search exercises..."
            autoFocus={true}
          />
          {showAddNew && (
            <Button
              variant="neutral"
              onClick={() => handleAddNewExercise(searchTerm.trim())}
              className="w-full mt-3"
            >
              Create & add "{searchTerm.trim()}"
            </Button>
          )}
        </div>

        {/* Selected exercises - compact pills below search */}
        {session && session.exercises.length > 0 && (
          <div className="flex-shrink-0 py-2.5 -mx-6 px-6 bg-surface/30 border-b border-border-subtle">
            <div className="flex flex-wrap gap-1.5">
              {session.exercises.map((exercise) => (
                <Pill
                  key={exercise.id}
                  variant="accent"
                  className="text-xs py-0.5 px-2 group"
                >
                  <span className="pr-1">{exercise.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveExercise(exercise.id);
                    }}
                    className="ml-0.5 hover:bg-accent/20 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${exercise.name}`}
                    title={`Remove ${exercise.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Pill>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable search results area */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {isEmptyQuery ? (
            hasRecents ? (
              <ExerciseList
                exercises={recentExercises}
                onSelect={(exercise) => handleSelectExercise(exercise.name)}
                selectedExercises={loggedExerciseNames}
                inSessionExercises={loggedExerciseNames}
                mode="ADD_TO_SESSION"
                showDetails={true}
                showSecondaryMuscles={false}
                showCategory={false}
                emptyMessage=""
              />
            ) : null
          ) : (
            hasSearchResults ? (
              <>
                {searchResults.matches.length > 0 && (
                  <ExerciseList
                    exercises={searchResults.matches}
                    onSelect={(exercise) => handleSelectExercise(exercise.name)}
                    selectedExercises={loggedExerciseNames}
                    inSessionExercises={loggedExerciseNames}
                    mode="ADD_TO_SESSION"
                    showDetails={true}
                    showSecondaryMuscles={true}
                    showCategory={true}
                    emptyMessage=""
                  />
                )}
                {searchResults.related.length > 0 && searchResults.matches.length > 0 && (
                  <div className="py-2">
                    <div className="h-px bg-border-subtle"></div>
                  </div>
                )}
                {searchResults.related.length > 0 && (
                  <ExerciseList
                    exercises={searchResults.related}
                    onSelect={(exercise) => handleSelectExercise(exercise.name)}
                    selectedExercises={loggedExerciseNames}
                    inSessionExercises={loggedExerciseNames}
                    mode="ADD_TO_SESSION"
                    showDetails={true}
                    showSecondaryMuscles={true}
                    showCategory={true}
                    emptyMessage=""
                  />
                )}
              </>
            ) : null
          )}
        </div>

        {/* Sticky bottom button */}
        {session && session.exercises.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-border-subtle mt-auto -mx-6 px-6">
            <Button 
              variant="primary" 
              onClick={handleStartLogging} 
              className="w-full"
            >
              {buttonLabel}
            </Button>
          </div>
        )}

        {/* Feedback message for already added */}
        {showAddedFeedback && (
          <div 
            className="fixed left-1/2 transform -translate-x-1/2 bg-surface border border-border-subtle rounded-lg px-4 py-2 shadow-lg z-50 animate-in fade-in duration-200 bottom-24"
          >
            <p className="text-sm text-text-muted">
              {showAddedFeedback.isDuplicate ? 'Already added' : 'Added'}
            </p>
          </div>
        )}
      </div>
    </ExerciseSearchBottomSheet>
  );
}
