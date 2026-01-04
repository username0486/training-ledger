import { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, GripVertical, Plus, SkipForward, Clock, Edit2, MoreVertical, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Pill } from '../components/Pill';
import { PersistentBottomSheet } from '../components/PersistentBottomSheet';
import { Exercise, Set, Workout } from '../types';
import { formatRelativeTime, getRecentSessionsForExercise } from '../utils/storage';
import { loadExercisesDB, searchExercises } from '../utils/exerciseDb';

interface WorkoutSessionScreenProps {
  workoutName: string;
  exercises: Exercise[];
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  allWorkouts: Workout[];
  onBack: () => void;
  onAddExercise: (name: string) => void;
  onAddSet: (exerciseId: string, weight: number, reps: number, restDuration?: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onCompleteExercise: (exerciseId: string) => void;
  onSkipExercise: (exerciseId: string) => void;
  onDeferExercise: (exerciseId: string) => void;
  onReorderExercises: (exercises: Exercise[]) => void;
  onFinishWorkout: () => void;
}

export function WorkoutSessionScreen({
  workoutName,
  exercises,
  lastSessionData,
  allWorkouts,
  onBack,
  onAddExercise,
  onAddSet,
  onDeleteSet,
  onCompleteExercise,
  onSkipExercise,
  onDeferExercise,
  onReorderExercises,
  onFinishWorkout,
}: WorkoutSessionScreenProps) {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [restTimerStart, setRestTimerStart] = useState<number | null>(null);
  const [restTimerElapsed, setRestTimerElapsed] = useState(0);
  const [exerciseListTab, setExerciseListTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [animateCompleted, setAnimateCompleted] = useState(false);
  const previousCompletedCountRef = useRef(0);

  // Focus State
  const [progressionExerciseId, setProgressionExerciseId] = useState<string | null>(() => {
    const firstIncomplete = exercises.find(ex => !ex.isComplete);
    return firstIncomplete?.id || null;
  });
  const [interactionFocusExerciseId, setInteractionFocusExerciseId] = useState<string | null>(() => {
    const firstIncomplete = exercises.find(ex => !ex.isComplete);
    return firstIncomplete?.id || null;
  });

  // Update focus when exercises change (e.g., when starting a workout)
  useEffect(() => {
    if (!progressionExerciseId && exercises.length > 0) {
      const firstIncomplete = exercises.find(ex => !ex.isComplete);
      if (firstIncomplete) {
        setProgressionExerciseId(firstIncomplete.id);
        setInteractionFocusExerciseId(firstIncomplete.id);
      }
    }
  }, [exercises, progressionExerciseId]);

  const exercisesDB = loadExercisesDB();
  const searchResults = searchExercises(searchQuery, exercisesDB);
  const hasMatches = searchResults.length > 0;
  const showFallback = searchQuery.trim() !== '' && !hasMatches;

  // Find progression exercise and interaction focus exercise
  const progressionExercise = exercises.find(ex => ex.id === progressionExerciseId) || null;
  const focusExercise = exercises.find(ex => ex.id === interactionFocusExerciseId) || progressionExercise;
  
  // Completed exercises
  const completedExercises = exercises.filter(ex => ex.isComplete);
  
  // Track completed count changes for animation
  useEffect(() => {
    const newCount = completedExercises.length;
    const previousCount = previousCompletedCountRef.current;
    
    if (newCount > previousCount && previousCount > 0) {
      setAnimateCompleted(true);
      const timer = setTimeout(() => setAnimateCompleted(false), 1000);
      previousCompletedCountRef.current = newCount;
      return () => clearTimeout(timer);
    }
    
    previousCompletedCountRef.current = newCount;
  }, [completedExercises.length]);
  
  // Upcoming exercises (after progression exercise, incomplete)
  const progressionIndex = progressionExercise ? exercises.indexOf(progressionExercise) : -1;
  const upcomingExercises = progressionExercise && progressionIndex >= 0
    ? exercises.slice(progressionIndex + 1).filter(ex => !ex.isComplete)
    : exercises.filter(ex => !ex.isComplete);

  // Get last session data for focus exercise
  const lastSession = focusExercise ? lastSessionData.get(focusExercise.name) : null;

  // Prefill with last logged set when a set is added
  useEffect(() => {
    if (focusExercise && focusExercise.sets.length > 0) {
      const lastSet = focusExercise.sets[focusExercise.sets.length - 1];
      setWeight(lastSet.weight.toString());
      setReps(lastSet.reps.toString());
    }
  }, [focusExercise?.sets.length]);

  // Rest timer effect
  useEffect(() => {
    if (restTimerStart === null) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restTimerStart) / 1000);
      setRestTimerElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimerStart]);

  const handleAddSet = () => {
    if (!focusExercise) return;
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!isNaN(w) && w >= 0 && r > 0) {
      onAddSet(focusExercise.id, w, r, restTimerElapsed);
      setWeight('');
      setReps('');
      // Start rest timer
      setRestTimerStart(Date.now());
    }
  };

  const handleCompleteExercise = () => {
    if (!focusExercise) return;
    if (focusExercise.sets.length === 0) return;
    
    // Complete the exercise
    onCompleteExercise(focusExercise.id);
    
    // If focus exercise is progression exercise, advance progression
    if (focusExercise.id === progressionExerciseId) {
      const nextIncomplete = upcomingExercises[0];
      if (nextIncomplete) {
        setProgressionExerciseId(nextIncomplete.id);
        setInteractionFocusExerciseId(nextIncomplete.id);
      } else {
        // No more exercises - clear both
        setProgressionExerciseId(null);
        setInteractionFocusExerciseId(null);
      }
    } else {
      // Editing completed exercise - restore focus to progression
      setInteractionFocusExerciseId(progressionExerciseId);
    }
  };

  const handleSkipExercise = (exerciseId: string) => {
    onSkipExercise(exerciseId);
    
    // If skipping progression exercise, advance progression
    if (exerciseId === progressionExerciseId) {
      const nextIncomplete = upcomingExercises[0];
      if (nextIncomplete) {
        setProgressionExerciseId(nextIncomplete.id);
        setInteractionFocusExerciseId(nextIncomplete.id);
      } else {
        setProgressionExerciseId(null);
        setInteractionFocusExerciseId(null);
      }
    }
  };

  const handleDeferExercise = (exerciseId: string) => {
    onDeferExercise(exerciseId);
    
    // If deferring progression exercise, advance progression to next
    if (exerciseId === progressionExerciseId) {
      const nextIncomplete = upcomingExercises[0];
      if (nextIncomplete) {
        setProgressionExerciseId(nextIncomplete.id);
        setInteractionFocusExerciseId(nextIncomplete.id);
      }
    }
  };

  const handleEditCompletedExercise = (exerciseId: string) => {
    // Set interaction focus to the completed exercise for editing
    // Do NOT change completion state or progression
    setInteractionFocusExerciseId(exerciseId);
  };

  const handleCancelEdit = () => {
    // Restore focus to progression exercise
    setInteractionFocusExerciseId(progressionExerciseId);
  };

  const handleTabClick = (tabId: string) => {
    setExerciseListTab(tabId as 'upcoming' | 'completed');
  };

  const collapseDrawer = () => {
  };

  const handleAddExerciseFromModal = (name: string) => {
    if (name.trim()) {
      onAddExercise(name.trim());
      setSearchQuery('');
      setShowAddExercise(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reorderedUpcoming = [...upcomingExercises];
    const draggedItem = reorderedUpcoming[draggedIndex];
    reorderedUpcoming.splice(draggedIndex, 1);
    reorderedUpcoming.splice(index, 0, draggedItem);
    
    // Reconstruct full exercise list
    const newExercises = [
      ...completedExercises,
      ...(progressionExercise ? [progressionExercise] : []),
      ...reorderedUpcoming,
    ];
    
    onReorderExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={workoutName}
        onBack={onBack}
        rightAction={
          <Button size="sm" variant="primary" onClick={onFinishWorkout}>
            Save Session
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-5 space-y-6">{/* Removed pb-40 */}
          {/* Current Exercise - Dominant */}
          {focusExercise ? (
            <div className="space-y-4 bg-gradient-to-b from-surface/40 to-surface/20 p-6 rounded-2xl border border-border">
              {/* Editing mode indicator */}
              {focusExercise.isComplete && focusExercise.id !== progressionExerciseId && (
                <div className="px-4 py-3 bg-surface rounded-lg border border-accent/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-accent" />
                    <p className="text-sm">Editing completed exercise</p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    Back to workout
                  </button>
                </div>
              )}
              
              {/* Exercise name and last session context */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-2xl">{focusExercise.name}</h2>
                  
                  {/* Overflow menu */}
                  {(focusExercise.sets.length === 0 || upcomingExercises.length > 0) && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                        className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {/* Dropdown menu */}
                      {showOverflowMenu && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowOverflowMenu(false)}
                          />
                          
                          {/* Menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-panel border border-border-medium rounded-lg shadow-xl overflow-hidden z-20">
                            {focusExercise.sets.length === 0 && (
                              <button
                                onClick={() => {
                                  handleSkipExercise(focusExercise.id);
                                  setShowOverflowMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3"
                              >
                                <SkipForward className="w-4 h-4 text-text-muted" />
                                <span>Skip exercise</span>
                              </button>
                            )}
                            {upcomingExercises.length > 0 && (
                              <button
                                onClick={() => {
                                  handleDeferExercise(focusExercise.id);
                                  setShowOverflowMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3"
                              >
                                <Clock className="w-4 h-4 text-text-muted" />
                                <span>Defer to end</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Rest Timer or Last Session */}
                {restTimerStart !== null && focusExercise.sets.length > 0 ? (
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
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full text-left text-text-muted px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle hover:bg-surface hover:border-border transition-all"
                  >
                    <p className="text-xs uppercase tracking-wide mb-1">Last time · {formatRelativeTime(lastSession.date)}</p>
                    <div className="flex gap-3 flex-wrap">
                      {lastSession.sets.map((set, idx) => (
                        <span key={idx} className="text-sm">
                          {set.weight} kg × {set.reps}
                        </span>
                      ))}
                    </div>
                  </button>
                ) : null}
              </div>

              {/* Logged sets for current exercise */}
              {focusExercise.sets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-text-muted px-1">
                    Sets ({focusExercise.sets.length})
                  </p>
                  <div className="space-y-1">
                    {focusExercise.sets.map((set, index) => (
                      <div
                        key={set.id}
                        className="flex items-center justify-between px-4 py-3 bg-surface rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-text-muted w-6">#{index + 1}</span>
                          <div>
                            <span>{set.weight} kg</span>
                            <span className="text-text-muted mx-2">×</span>
                            <span>{set.reps} reps</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteSet(focusExercise.id, set.id)}
                          className="text-text-muted hover:text-danger transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Set logging inputs */}
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
                    autoFocus
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
                
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleAddSet}
                    className="flex-1"
                    disabled={weight === '' || reps === '' || parseInt(reps) <= 0}
                  >
                    Log Set
                  </Button>
                  {focusExercise.sets.length > 0 && (
                    <Button
                      variant="neutral"
                      onClick={handleCompleteExercise}
                      className="flex-shrink-0"
                    >
                      <Check className="w-4 h-4 mr-2 inline" />
                      End Exercise
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : exercises.length > 0 ? (
            /* All exercises complete */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-accent" />
              </div>
              <h3 className="mb-2">All exercises complete</h3>
              <p className="text-text-muted mb-6">
                Add more exercises to continue your workout.
              </p>
              <div className="flex flex-col gap-3 max-w-md mx-auto">
                <Button 
                  variant="primary" 
                  onClick={() => setShowAddExercise(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Exercise
                </Button>
              </div>
            </div>
          ) : (
            /* No exercises yet */
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No exercises yet</p>
              <Button variant="primary" onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          )}

          {/* Persistent Bottom Sheet for Up Next & Completed */}
          {(upcomingExercises.length > 0 || completedExercises.length > 0) && (
            <PersistentBottomSheet
              peekContent={
                <div className="text-base flex items-center gap-1">
                  {upcomingExercises.length > 0 && (
                    <span className="text-xs uppercase tracking-wide text-text-muted">
                      {upcomingExercises.length} upcoming
                    </span>
                  )}
                  {upcomingExercises.length > 0 && completedExercises.length > 0 && (
                    <span className="text-text-muted">·</span>
                  )}
                  {completedExercises.length > 0 && (
                    <span className={`text-text-muted ${animateCompleted ? 'animate-pulse-completed' : ''}`}>
                      {completedExercises.length} completed
                    </span>
                  )}
                </div>
              }
            >
              <div className="space-y-6">
                {/* Up Next Section */}
                {upcomingExercises.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted mb-3">
                      Up Next ({upcomingExercises.length})
                    </p>
                    <div className="space-y-2">
                      {upcomingExercises.map((exercise, index) => {
                        const lastData = lastSessionData.get(exercise.name);
                        return (
                          <div
                            key={exercise.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 px-4 py-4 bg-surface/30 rounded-lg border border-border-subtle hover:bg-surface/50 transition-all cursor-grab active:cursor-grabbing ${
                              draggedIndex === index ? 'opacity-50' : ''
                            }`}
                          >
                            <GripVertical className="w-5 h-5 text-text-muted flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-base">{exercise.name}</p>
                              {lastData && (
                                <p className="text-sm text-text-muted mt-0.5">
                                  Last: {lastData.sets.length} sets · {formatRelativeTime(lastData.date)}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleSkipExercise(exercise.id)}
                              className="text-text-muted hover:text-text-primary transition-colors p-2"
                              title="Skip"
                            >
                              <SkipForward className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeferExercise(exercise.id)}
                              className="text-text-muted hover:text-text-primary transition-colors p-2"
                              title="Defer"
                            >
                              <Clock className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setShowAddExercise(true)}
                        className="w-full py-2 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-2 border-t border-border-subtle mt-2 pt-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add exercise</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Completed Section */}
                {completedExercises.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted mb-3">
                      Completed ({completedExercises.length})
                    </p>
                    <div className="space-y-2">
                      {completedExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="px-4 py-4 bg-surface/30 rounded-lg border border-border-subtle"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="mb-1 text-base">{exercise.name}</p>
                              <p className="text-sm text-text-muted">
                                {exercise.sets.length} sets
                              </p>
                            </div>
                            <button
                              onClick={() => handleEditCompletedExercise(exercise.id)}
                              className="text-text-muted hover:text-accent transition-colors p-2"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            {exercise.sets.map((set, index) => (
                              <div
                                key={set.id}
                                className="flex items-center gap-3 text-sm px-2 py-1"
                              >
                                <span className="text-text-muted w-6">#{index + 1}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-text-muted">{set.weight} kg × {set.reps} reps</span>
                                  {set.restDuration !== undefined && set.restDuration > 0 && (
                                    <>
                                      <span className="text-text-muted/40">·</span>
                                      <span className="text-text-muted/60 text-xs tabular-nums">
                                        {Math.floor(set.restDuration / 60)}:{(set.restDuration % 60).toString().padStart(2, '0')} rest
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PersistentBottomSheet>
          )}
        </div>
      </div>

      {/* Add Exercise Modal */}
      <Modal
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false);
          setSearchQuery('');
        }}
        title="Add Exercise"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          
          <div className="max-h-[300px] overflow-y-auto -mx-6 px-6 space-y-1">
            {hasMatches ? (
              searchResults.map((exerciseName) => (
                <button
                  key={exerciseName}
                  onClick={() => handleAddExerciseFromModal(exerciseName)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors"
                >
                  <p className="text-text-primary">{exerciseName}</p>
                </button>
              ))
            ) : showFallback ? (
              <button
                onClick={() => handleAddExerciseFromModal(searchQuery)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-text-primary mb-0.5">Add new exercise</p>
                  <p className="text-text-muted">{searchQuery}</p>
                </div>
                <span className="text-accent">Add</span>
              </button>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Exercise History Modal */}
      {focusExercise && (
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title={focusExercise.name}
        >
          <div className="space-y-4">
            {(() => {
              if (!allWorkouts || !focusExercise) {
                return <p className="text-text-muted text-center py-6">No previous sessions</p>;
              }
              
              // Check if function exists, if not import it dynamically
              if (typeof getRecentSessionsForExercise === 'undefined') {
                console.error('getRecentSessionsForExercise is not defined');
                return <p className="text-text-muted text-center py-6">Error loading sessions</p>;
              }
              
              try {
                const recentSessions = getRecentSessionsForExercise(focusExercise.name, allWorkouts, 5);
                if (recentSessions.length === 0) {
                  return <p className="text-text-muted text-center py-6">No previous sessions found for this exercise</p>;
                }
                return (
                  <>
                    <p className="text-xs uppercase tracking-wide text-text-muted">
                      Recent Sessions
                    </p>
                    <div className="space-y-3">
                      {recentSessions.map((session, sessionIdx) => (
                        <div
                          key={sessionIdx}
                          className="px-4 py-3 bg-surface rounded-lg border border-border-subtle"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-text-muted">{formatRelativeTime(session.date)}</p>
                            <span className="text-xs text-text-muted">{session.workoutName}</span>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            {session.sets.map((set, setIdx) => (
                              <span key={setIdx} className="text-sm">
                                {set.weight} kg × {set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              } catch (error) {
                console.error('Error loading recent sessions:', error);
                return <p className="text-text-muted text-center py-6">Error loading sessions</p>;
              }
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}