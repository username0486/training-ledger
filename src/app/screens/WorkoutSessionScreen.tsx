import { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, GripVertical, Plus, SkipForward, Clock, Edit2, MoreHorizontal, X, ArrowRightLeft, ListEnd } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { Pill } from '../components/Pill';
import { PersistentBottomSheet } from '../components/PersistentBottomSheet';
import { Exercise, Set, Workout } from '../types';
import { formatRelativeTime, getRecentSessionsForExercise } from '../utils/storage';
import { ExerciseSearch, ExerciseSearchHandle } from '../components/ExerciseSearch';
import { getAllExercisesList } from '../../utils/exerciseDb';
import { formatWeight } from '../../utils/weightFormat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

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
  onSwapExercise: (exerciseId: string, newExerciseName: string) => void;
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
  onSwapExercise,
  onReorderExercises,
  onFinishWorkout,
}: WorkoutSessionScreenProps) {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSwapExercise, setShowSwapExercise] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [isDraggingFromHandle, setIsDraggingFromHandle] = useState(false);
  const [restTimerStart, setRestTimerStart] = useState<number | null>(null);
  const [restTimerElapsed, setRestTimerElapsed] = useState(0);
  const [exerciseListTab, setExerciseListTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [animateCompleted, setAnimateCompleted] = useState(false);
  const previousCompletedCountRef = useRef(0);
  const addExerciseSearchRef = useRef<ExerciseSearchHandle>(null);
  const swapExerciseSearchRef = useRef<ExerciseSearchHandle>(null);

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
  // This is critical: when a new workout is loaded, ensure we find the first incomplete exercise
  useEffect(() => {
    if (exercises.length > 0) {
      const firstIncomplete = exercises.find(ex => !ex.isComplete);
      if (firstIncomplete) {
        // Always set focus to first incomplete exercise when exercises change
        // This ensures new workouts don't show "all complete" screen
        if (!progressionExerciseId || progressionExerciseId !== firstIncomplete.id) {
          setProgressionExerciseId(firstIncomplete.id);
        }
        if (!interactionFocusExerciseId || interactionFocusExerciseId !== firstIncomplete.id) {
          setInteractionFocusExerciseId(firstIncomplete.id);
        }
      } else {
        // All exercises are complete - this is expected only when user actually completes them
        // For new workouts, this should never happen, so log a warning
        if (import.meta.env.DEV) {
          console.warn('[WorkoutSessionScreen] All exercises are complete on load:', {
            exerciseCount: exercises.length,
            exercises: exercises.map(ex => ({ name: ex.name, isComplete: ex.isComplete, sets: ex.sets.length }))
          });
        }
      }
    } else if (progressionExerciseId || interactionFocusExerciseId) {
      // Clear focus if exercises array becomes empty
      setProgressionExerciseId(null);
      setInteractionFocusExerciseId(null);
    }
  }, [exercises]);


  // Find progression exercise and interaction focus exercise
  const progressionExercise = exercises.find(ex => ex.id === progressionExerciseId) || null;
  const focusExercise = exercises.find(ex => ex.id === interactionFocusExerciseId) || progressionExercise;
  
  // Prefill inputs with last set's values ONLY after a set is added (not on initial load)
  useEffect(() => {
    if (focusExercise && focusExercise.sets.length > 0) {
      const lastSet = focusExercise.sets[focusExercise.sets.length - 1];
      setWeight(lastSet.weight.toString());
      setReps(lastSet.reps.toString());
    } else if (focusExercise && focusExercise.sets.length === 0) {
      // Clear fields when moving to a new exercise (no sets yet)
      setWeight('');
      setReps('');
    }
  }, [focusExercise?.id, focusExercise?.sets.length]);
  
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

  // Rest timer logic
  useEffect(() => {
    if (restTimerStart === null) {
      setRestTimerElapsed(0);
      return;
    }

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
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

    onAddSet(focusExercise.id, w, r, restTimerElapsed > 0 ? restTimerElapsed : undefined);
    
    // Prefill with the set we just added (for next set)
    setWeight(w.toString());
    setReps(r.toString());
    
    // Start rest timer after adding set
    setRestTimerStart(Date.now());
    setRestTimerElapsed(0);
  };

  const handleDeleteSet = (setId: string) => {
    if (!focusExercise) return;
    onDeleteSet(focusExercise.id, setId);
  };

  const handleCompleteExercise = () => {
    if (!focusExercise) return;
    onCompleteExercise(focusExercise.id);
    
    // Move to next incomplete exercise
    const currentIndex = exercises.findIndex(ex => ex.id === focusExercise.id);
    const nextIncomplete = exercises.slice(currentIndex + 1).find(ex => !ex.isComplete);
    if (nextIncomplete) {
      setProgressionExerciseId(nextIncomplete.id);
      setInteractionFocusExerciseId(nextIncomplete.id);
    } else {
      // No more incomplete exercises
      setProgressionExerciseId(null);
      setInteractionFocusExerciseId(null);
    }
  };

  const handleSkipExercise = (exerciseId: string) => {
    onSkipExercise(exerciseId);
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      const currentIndex = exercises.indexOf(exercise);
      const nextIncomplete = exercises.slice(currentIndex + 1).find(ex => !ex.isComplete);
      if (nextIncomplete) {
        setProgressionExerciseId(nextIncomplete.id);
        setInteractionFocusExerciseId(nextIncomplete.id);
      }
    }
  };

  const handleDeferExercise = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    // Find the next incomplete exercise BEFORE deferring (so we have the correct list)
    const currentIndex = exercises.indexOf(exercise);
    const nextIncomplete = exercises.slice(currentIndex + 1).find(ex => !ex.isComplete);
    
    // Defer the exercise (moves it to end)
    onDeferExercise(exerciseId);
    
    // Move to next incomplete exercise if one exists
    if (nextIncomplete) {
      setProgressionExerciseId(nextIncomplete.id);
      setInteractionFocusExerciseId(nextIncomplete.id);
    } else {
      // If no next incomplete, check if there are any incomplete exercises left
      // (the deferred one is now at the end, so we might need to find the first incomplete)
      const firstIncomplete = exercises.find(ex => !ex.isComplete && ex.id !== exerciseId);
      if (firstIncomplete) {
        setProgressionExerciseId(firstIncomplete.id);
        setInteractionFocusExerciseId(firstIncomplete.id);
      }
    }
  };

  const handleSwapExercise = (newExerciseName: string) => {
    if (!focusExercise) return;
    onSwapExercise(focusExercise.id, newExerciseName);
    setShowSwapExercise(false);
  };


  const handleFocusExercise = (exerciseId: string) => {
    setInteractionFocusExerciseId(exerciseId);
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise && !exercise.isComplete) {
      setProgressionExerciseId(exerciseId);
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
      setShowAddExercise(false);
      // If we were in the "all exercises completed" state, refocus on the new exercise
      if (!focusExercise) {
        // The new exercise will be added and focus will be set automatically
      }
    }
  };

  const handleAddNewExercise = (name: string) => {
    // Add new exercise to DB and to workout
    try {
      const { addExerciseToDb } = require('../utils/exerciseDb');
      addExerciseToDb(name);
    } catch (error) {
      // Might already exist
    }
    handleAddExerciseFromModal(name);
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

  // Touch/pointer handlers for mobile
  const handleHandleTouchStart = (e: React.TouchEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartIndex(index);
    setDraggedIndex(index);
    setIsDraggingFromHandle(true);
  };

  const handleHandlePointerDown = (e: React.PointerEvent, index: number) => {
    // Prevent text selection on mobile
    e.preventDefault();
    e.stopPropagation();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setTouchStartY(e.clientY);
      setTouchStartIndex(index);
      setDraggedIndex(index);
      setIsDraggingFromHandle(true);
    }
  };

  const handleRowTouchMove = (e: React.TouchEvent, index: number) => {
    if (!isDraggingFromHandle || touchStartY === null || touchStartIndex === null) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;

    // Only reorder if moved significantly (more than 20px)
    if (Math.abs(deltaY) > 20) {
      const reorderedUpcoming = [...upcomingExercises];
      const draggedItem = reorderedUpcoming[touchStartIndex];
      
      // Calculate target index based on movement
      const rowHeight = 60; // Approximate row height
      const targetOffset = Math.round(deltaY / rowHeight);
      let targetIndex = touchStartIndex + targetOffset;
      targetIndex = Math.max(0, Math.min(targetIndex, reorderedUpcoming.length - 1));

      if (targetIndex !== touchStartIndex) {
        reorderedUpcoming.splice(touchStartIndex, 1);
        reorderedUpcoming.splice(targetIndex, 0, draggedItem);
        
        // Reconstruct full exercise list
        const newExercises = [
          ...completedExercises,
          ...(progressionExercise ? [progressionExercise] : []),
          ...reorderedUpcoming,
        ];
        
        onReorderExercises(newExercises);
        setTouchStartIndex(targetIndex);
        setDraggedIndex(targetIndex);
      }
    }
  };

  const handleRowTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingFromHandle) return;
    e.preventDefault();
    e.stopPropagation();
    setTouchStartY(null);
    setTouchStartIndex(null);
    setDraggedIndex(null);
    setIsDraggingFromHandle(false);
  };

  if (!focusExercise) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar title={workoutName} onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 w-full max-w-sm px-5">
            <p className="text-text-muted">All exercises completed!</p>
            <Button variant="primary" onClick={onFinishWorkout} className="w-full">
              Finish Workout
            </Button>
            <Button variant="neutral" onClick={() => setShowAddExercise(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Another Exercise
            </Button>
          </div>
        </div>

        {/* Add Exercise Bottom Sheet - available even when all exercises are completed */}
        <ExerciseSearchBottomSheet
          isOpen={showAddExercise}
          onClose={() => {
            setShowAddExercise(false);
          }}
          title="Add Exercise"
        >
          <ExerciseSearch
            onSelectExercise={handleAddExerciseFromModal}
            onAddNewExercise={handleAddNewExercise}
            placeholder="Search exercises..."
            autoFocus={true}
            showDetails={true}
            createButtonLabel="Create & add"
          />
        </ExerciseSearchBottomSheet>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-panel">
      <TopBar title={workoutName} onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* Progression Exercise Card */}
          <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{focusExercise.name}</h2>
              <div className="flex items-center gap-2">
                {focusExercise.isComplete && (
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-accent" />
                    <p className="text-sm">Editing completed exercise</p>
                  </div>
                )}
                {focusExercise.isComplete && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {!focusExercise.isComplete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface/50">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          handleSkipExercise(focusExercise.id);
                        }}
                        className="cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip Exercise
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          handleDeferExercise(focusExercise.id);
                        }}
                        className="cursor-pointer"
                      >
                        <ListEnd className="w-4 h-4 mr-2" />
                        Defer to End
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setShowSwapExercise(true);
                        }}
                        className="cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Swap Exercise
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Rest Timer or Last Session Info */}
            {restTimerStart !== null && focusExercise.sets.length > 0 ? (
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
            ) : (() => {
              const lastData = lastSessionData.get(focusExercise.name);
              return lastData ? (
                <button
                  onClick={() => {
                    // Auto-fill weight from last session (lowest weight)
                    if (lastData.sets.length > 0) {
                      const lowestWeight = Math.min(...lastData.sets.map(s => s.weight));
                      setWeight(lowestWeight.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle text-left hover:bg-surface/70 transition-colors"
                >
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                    Last Session · {formatRelativeTime(lastData.date)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {lastData.sets.map((set, idx) => (
                      <span key={idx} className="text-sm text-text-primary">
                        {formatWeight(set.weight)} × {set.reps}
                      </span>
                    ))}
                  </div>
                </button>
              ) : null;
            })()}

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
                {!focusExercise.isComplete && focusExercise.sets.length > 0 && (
                  <Button
                    variant="neutral"
                    onClick={handleCompleteExercise}
                    disabled={focusExercise.sets.length === 0}
                  >
                    <Check className="w-4 h-4 mr-2 inline" />
                    Done
                  </Button>
                )}
              </div>
            </div>

            {/* Sets list - below inputs */}
            {focusExercise.sets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">Sets</p>
                {focusExercise.sets.map((set, index) => (
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
                      onClick={() => handleDeleteSet(set.id)}
                      className="text-text-muted hover:text-danger transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exercise List */}
          {exercises.length === 0 ? (
            /* No exercises yet */
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No exercises yet</p>
              <Button variant="primary" onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Exercise
              </Button>
            </div>
          ) : null}

          {/* Persistent Bottom Sheet for Up Next & Completed */}
          {(upcomingExercises.length > 0 || completedExercises.length > 0) && (
            <PersistentBottomSheet
              peekContent={
                <div className="text-sm flex items-center gap-1">
                  {upcomingExercises.length > 0 && (
                    <span className="text-sm uppercase tracking-wide text-text-muted">
                      {upcomingExercises.length} upcoming
                    </span>
                  )}
                  {upcomingExercises.length > 0 && completedExercises.length > 0 && (
                    <span className="text-text-muted">·</span>
                  )}
                  {completedExercises.length > 0 && (
                    <span className={`text-sm uppercase tracking-wide text-text-muted ${animateCompleted ? 'animate-pulse-completed' : ''}`}>
                      {completedExercises.length} COMPLETED
                    </span>
                  )}
                </div>
              }
            >
              {(isExpanded) => (
                <div className="space-y-6">
                  {/* Header with Add Exercise button - only shown when expanded */}
                  {isExpanded && (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {upcomingExercises.length > 0 && (
                          <p className="text-xs uppercase tracking-wide text-text-muted">
                            Up Next ({upcomingExercises.length})
                          </p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => setShowAddExercise(true)}
                        className="flex items-center gap-2"
                        title="Add exercise"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm">Add exercise</span>
                      </Button>
                    </div>
                  )}

                  {/* Up Next Section */}
                  {upcomingExercises.length > 0 && (
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
                            onTouchMove={(e) => handleRowTouchMove(e, index)}
                            onTouchEnd={handleRowTouchEnd}
                            className={`flex items-center gap-3 px-4 py-4 bg-surface/30 rounded-lg border border-border-subtle hover:bg-surface/50 transition-all cursor-grab active:cursor-grabbing ${
                              draggedIndex === index ? 'opacity-50' : ''
                            }`}
                          >
                            <div
                              onTouchStart={(e) => handleHandleTouchStart(e, index)}
                              onPointerDown={(e) => handleHandlePointerDown(e, index)}
                              className="flex-shrink-0 drag-handle"
                              style={{
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none',
                                userSelect: 'none',
                                touchAction: 'none',
                              }}
                            >
                              <GripVertical className="w-5 h-5 text-text-muted" />
                            </div>
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
                    </div>
                  )}

                  {/* Completed Section */}
                  {completedExercises.length > 0 && (
                    <div>
                      {isExpanded && (
                        <p className="text-xs uppercase tracking-wide text-text-muted mb-3">
                          Completed ({completedExercises.length})
                        </p>
                      )}
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
                                    <span className="text-text-muted">{formatWeight(set.weight)} × {set.reps} reps</span>
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
              )}
            </PersistentBottomSheet>
          )}
        </div>
      </div>

      {/* Add Exercise Bottom Sheet */}
      <ExerciseSearchBottomSheet
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false);
        }}
        title="Add Exercise"
        onScrollStart={() => addExerciseSearchRef.current?.blur()}
      >
        <ExerciseSearch
          ref={addExerciseSearchRef}
          onSelectExercise={handleAddExerciseFromModal}
          onAddNewExercise={handleAddNewExercise}
          placeholder="Search exercises..."
          autoFocus={true}
          showDetails={true}
          createButtonLabel="Create & add"
        />
      </ExerciseSearchBottomSheet>

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
                        <div key={sessionIdx} className="p-4 bg-surface rounded-lg border border-border-subtle">
                          <p className="text-sm text-text-muted mb-2">
                            {formatRelativeTime(session.date)}
                          </p>
                          <div className="space-y-1">
                            {session.sets.map((set, setIdx) => (
                              <div key={setIdx} className="text-sm text-text-primary">
                                {formatWeight(set.weight)} × {set.reps} reps
                              </div>
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

      {/* Swap Exercise Bottom Sheet */}
      {focusExercise && (
        <ExerciseSearchBottomSheet
          isOpen={showSwapExercise}
          onClose={() => setShowSwapExercise(false)}
          title={`Swap "${focusExercise.name}"`}
          onScrollStart={() => swapExerciseSearchRef.current?.blur()}
        >
          <ExerciseSearch
            ref={swapExerciseSearchRef}
            onSelectExercise={(exerciseName) => {
              handleSwapExercise(exerciseName);
            }}
            onAddNewExercise={(name) => {
              handleSwapExercise(name);
            }}
            placeholder="Search for replacement..."
            autoFocus={true}
            showDetails={true}
            createButtonLabel="Swap"
            swapContext={(() => {
              // Find the exercise in the DB to get full metadata
              const allExercises = getAllExercisesList();
              const dbExercise = allExercises.find(ex => ex.name === focusExercise.name);
              if (dbExercise) {
                return { originalExercise: dbExercise };
              }
              // Fallback: create a minimal exercise object from the workout exercise
              return {
                originalExercise: {
                  id: focusExercise.id,
                  name: focusExercise.name,
                  source: 'user' as const,
                  primaryMuscles: [],
                  secondaryMuscles: [],
                  equipment: [],
                },
              };
            })()}
          />
        </ExerciseSearchBottomSheet>
      )}
    </div>
  );
}
