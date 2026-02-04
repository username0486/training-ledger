import { useState, useEffect, useRef } from 'react';
import { Check, ChevronRight, GripVertical, Plus, SkipForward, Clock, MoreHorizontal, X, ArrowRightLeft, ListEnd, Link2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ExerciseSearchBottomSheet } from '../components/ExerciseSearchBottomSheet';
import { Pill } from '../components/Pill';
import { PersistentBottomSheet } from '../components/PersistentBottomSheet';
import { PairWithSheet } from '../components/PairWithSheet';
import { SupersetBlock } from '../components/SupersetBlock';
import { SwapExerciseSheet } from '../components/SwapExerciseSheet';
import { RemoveExerciseSheet } from '../components/RemoveExerciseSheet';
import { Exercise, Set, Workout } from '../types';
import { formatRelativeTime, getRecentSessionsForExercise } from '../utils/storage';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { getAllExercisesList } from '../../utils/exerciseDb';
import { formatWeight, formatWeightForDisplay, convertKgToDisplay, convertDisplayToKg } from '../../utils/weightFormat';
import { getGroupInfo, filterGroupedMembers, buildSessionItems, SessionItem } from '../utils/exerciseGrouping';
import { SessionScrollLayout } from '../components/SessionScrollLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { CompactBottomSheet } from '../components/CompactBottomSheet';
import { OverflowActionGroup } from '../components/OverflowActionGroup';
import { CompletedSetsPanel } from '../components/CompletedSetsPanel';
import { RepsWeightGrid } from '../components/RepsWeightGrid';
import { ManageSetSheet } from '../components/ManageSetSheet';
import { LastSessionStats } from '../components/LastSessionStats';
import { ExerciseHistoryBottomSheet } from '../components/ExerciseHistoryBottomSheet';
import { formatDuration, getElapsedSec } from '../utils/duration';
import { getElapsedSince, formatRestTime, getGroupLastSetAt, formatElapsed } from '../utils/restTimer';
import { formatWorkoutTitle } from '../utils/periodOfDay';
import { getComparisonFlag } from '../utils/exerciseComparison';

interface WorkoutSessionScreenProps {
  workoutName: string;
  exercises: Exercise[];
  lastSessionData: Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>;
  allWorkouts: Workout[];
  onBack: () => void;
  onAddExercise: (name: string, pairWithExerciseId?: string, swapWithExerciseId?: string, swapGroupId?: string) => void;
  onAddSet: (exerciseId: string, weight: number, reps: number, restDuration?: number) => void;
  onAddSupersetSet?: (exercises: Array<{ exerciseId: string; weight: number; reps: number }>, supersetSetId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateSet?: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onCompleteExercise: (exerciseId: string) => void;
  onCompleteGroup?: (exerciseIds: string[]) => void;
  onSkipExercise: (exerciseId: string) => void;
  onDeferExercise: (exerciseId: string) => void;
  onSwapExercise: (exerciseId: string, newExerciseName: string) => void;
  onReorderExercises: (exercises: Exercise[]) => void;
  onFinishWorkout: () => void;
  onEndWorkout?: () => void; // Optional: end workout early (if not provided, uses onFinishWorkout)
  startedAt?: number;
  endedAt?: number;
  onEnsureStartedAt?: () => void; // ensures startedAt is set + persisted (idempotent)
  onGroupExercises?: (instanceIds: string[]) => void;
  onAddToGroup?: (groupId: string, instanceId: string) => void;
  onMergeGroups?: (groupId1: string, groupId2: string) => void;
  onUngroup?: (instanceId: string) => void;
  onSwapGroupMember?: (groupId: string, sourceMemberInstanceId: string, replacementInstanceId: string) => void;
}

export function WorkoutSessionScreen({
  workoutName,
  exercises,
  lastSessionData,
  allWorkouts,
  onBack,
  onAddExercise,
  onAddSet,
  onAddSupersetSet,
  onDeleteSet,
  onUpdateSet,
  onCompleteExercise,
  onCompleteGroup,
  onSkipExercise,
  onDeferExercise,
  onSwapExercise,
  onReorderExercises,
  onFinishWorkout,
  onEndWorkout,
  startedAt,
  endedAt,
  onEnsureStartedAt,
  onGroupExercises,
  onAddToGroup,
  onMergeGroups,
  onUngroup,
  onSwapGroupMember,
}: WorkoutSessionScreenProps) {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSwapExercise, setShowSwapExercise] = useState(false);
  const [showPairWith, setShowPairWith] = useState(false);
  // Group management state
  const [showPairAnother, setShowPairAnother] = useState(false);
  const [showSwapExerciseInSuperset, setShowSwapExerciseInSuperset] = useState(false);
  const [showRemoveExercise, setShowRemoveExercise] = useState(false);
  // Finish workout confirmation
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

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
  const [activeGroupIdForManagement, setActiveGroupIdForManagement] = useState<string | null>(null);
  const [exerciseToSwapId, setExerciseToSwapId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [combineTargetIndex, setCombineTargetIndex] = useState<number | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null);
  const [isDraggingOverActive, setIsDraggingOverActive] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [isDraggingFromHandle, setIsDraggingFromHandle] = useState(false);
  // Rest context: tracks which exercise/group owns the rest timer
  // Timer is computed from restStartedAtMs timestamp, not stored state
  // Initialize from persisted data: find exercise/group with most recent lastSetAt
  const [restOwnerId, setRestOwnerId] = useState<string | null>(() => {
    // Find exercise or group with most recent lastSetAt
    let mostRecentTimestamp = 0;
    let ownerId: string | null = null;
    
    // Group exercises by groupId
    const groups = new Map<string, Exercise[]>();
    exercises.forEach(ex => {
      if (ex.groupId) {
        if (!groups.has(ex.groupId)) {
          groups.set(ex.groupId, []);
        }
        groups.get(ex.groupId)!.push(ex);
      }
    });
    
    // Check groups first (they take precedence if multiple exercises share same timestamp)
    groups.forEach((groupExercises, groupId) => {
      const groupLastSetAt = getGroupLastSetAt(groupExercises);
      if (groupLastSetAt && groupLastSetAt > mostRecentTimestamp) {
        mostRecentTimestamp = groupLastSetAt;
        ownerId = groupId;
      }
    });
    
    // Check single exercises (not in groups)
    exercises.forEach(ex => {
      if (!ex.groupId && ex.lastSetAt && ex.lastSetAt > mostRecentTimestamp) {
        mostRecentTimestamp = ex.lastSetAt;
        ownerId = ex.id;
      }
    });
    
    return ownerId;
  }); // exerciseId or groupId
  
  // Track when rest timer started (timestamp of most recent set for rest owner)
  const [restStartedAtMs, setRestStartedAtMs] = useState<number | null>(() => {
    if (!restOwnerId) return null;
    
    // Find the timestamp for the rest owner
    const groups = new Map<string, Exercise[]>();
    exercises.forEach(ex => {
      if (ex.groupId) {
        if (!groups.has(ex.groupId)) {
          groups.set(ex.groupId, []);
        }
        groups.get(ex.groupId)!.push(ex);
      }
    });
    
    // Check if rest owner is a group
    if (groups.has(restOwnerId)) {
      const groupLastSetAt = getGroupLastSetAt(groups.get(restOwnerId)!);
      return groupLastSetAt;
    }
    
    // Check if rest owner is a single exercise
    const exercise = exercises.find(ex => ex.id === restOwnerId);
    return exercise?.lastSetAt || null;
  });
  // Bottom sheet state for standalone exercise overflow
  const [showExerciseOverflowSheet, setShowExerciseOverflowSheet] = useState(false);
  const [overflowExerciseId, setOverflowExerciseId] = useState<string | null>(null);
  // Manage set sheet state
  const [showManageSetSheet, setShowManageSetSheet] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedSetExerciseId, setSelectedSetExerciseId] = useState<string | null>(null);
  // History bottom sheet state
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);
  const [exerciseListTab, setExerciseListTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [animateCompleted, setAnimateCompleted] = useState(false);
  const previousCompletedCountRef = useRef(0);

  // Focus State - initialize with first incomplete item
  const getInitialActiveItemId = () => {
    const sessionItems = buildSessionItems(exercises);
    const firstIncompleteItem = sessionItems.find(item => !item.isComplete);
    return firstIncompleteItem?.id || null;
  };
  
  const [progressionExerciseId, setProgressionExerciseId] = useState<string | null>(() => {
    const firstIncomplete = exercises.find(ex => !ex.isComplete);
    return firstIncomplete?.id || null;
  });
  const [interactionFocusExerciseId, setInteractionFocusExerciseId] = useState<string | null>(() => {
    const firstIncomplete = exercises.find(ex => !ex.isComplete);
    return firstIncomplete?.id || null;
  });
  
  // Store last focused exercise ID before all exercises become complete
  // This allows us to restore the exact UI state when returning from "All exercises complete" screen
  const lastFocusedExerciseIdRef = useRef<string | null>(null);

  // Track exercise IDs and completion status separately to avoid triggering on set changes
  const exerciseIds = exercises.map(ex => ex.id).join(',');
  const exerciseCompletionStatus = exercises.map(ex => `${ex.id}:${ex.isComplete}`).join(',');
  
  // Track previous completion status to detect transitions (incomplete -> complete)
  const previousCompletionStatusRef = useRef<string>(exerciseCompletionStatus);
  
  // Update focus when exercises are added/removed or completion status changes
  // DO NOT trigger on set changes (editing/deleting sets should not change focus)
  // DO NOT change focus if user is currently editing a set (manage set sheet is open)
  useEffect(() => {
    // If manage set sheet is open, don't change focus (user is editing)
    if (showManageSetSheet) {
      return;
    }
    
    if (exercises.length > 0) {
      const firstIncomplete = exercises.find(ex => !ex.isComplete);
      if (firstIncomplete) {
        // Only update focus if:
        // 1. No focus is set yet, OR
        // 2. Current focus exercise no longer exists, OR
        // 3. Current focus exercise JUST became complete (transitioned from incomplete to complete)
        const currentFocusExists = exercises.find(ex => ex.id === interactionFocusExerciseId);
        const currentFocusIsComplete = currentFocusExists?.isComplete;
        
        // Check if the current focus exercise transitioned from incomplete to complete
        const previousStatus = previousCompletionStatusRef.current;
        const currentStatus = exerciseCompletionStatus;
        const focusExerciseId = interactionFocusExerciseId;
        const focusExerciseWasIncomplete = focusExerciseId && previousStatus.includes(`${focusExerciseId}:false`);
        const focusExerciseNowComplete = focusExerciseId && currentStatus.includes(`${focusExerciseId}:true`);
        const justBecameComplete = focusExerciseWasIncomplete && focusExerciseNowComplete;
        
        // Only reset focus if:
        // - No focus set, OR
        // - Focus exercise doesn't exist, OR
        // - Focus exercise JUST became complete (user pressed Done)
        // Do NOT reset if focus exercise was already complete (user is editing history)
        if (!progressionExerciseId || !currentFocusExists || justBecameComplete) {
          if (!interactionFocusExerciseId || !currentFocusExists || justBecameComplete) {
            setProgressionExerciseId(firstIncomplete.id);
            setInteractionFocusExerciseId(firstIncomplete.id);
          }
        }
      } else {
        // All exercises are complete - preserve the last focused exercise ID before clearing focus
        // This allows us to restore the exact UI state when user returns from "All exercises complete" screen
        if (interactionFocusExerciseId && !lastFocusedExerciseIdRef.current) {
          // Store the last focused exercise ID before it gets cleared
          lastFocusedExerciseIdRef.current = interactionFocusExerciseId;
        }
        
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
    
    // Update previous status for next comparison
    previousCompletionStatusRef.current = exerciseCompletionStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIds, exerciseCompletionStatus, showManageSetSheet]); // Only depend on IDs and completion status, not sets


  // Build session items (exercises + superset groups)
  const sessionItems = buildSessionItems(exercises);
  
  // Find progression exercise and interaction focus exercise
  const progressionExercise = exercises.find(ex => ex.id === progressionExerciseId) || null;
  const focusExercise = exercises.find(ex => ex.id === interactionFocusExerciseId) || progressionExercise;
  
  // Determine active item ID (groupId for supersets, exerciseId for singles)
  // If no focus exercise but we have exercises, use the last one (all complete scenario)
  const activeItemId = (() => {
    if (!focusExercise) {
      // All exercises complete - use last exercise or stored last focused
      if (lastFocusedExerciseIdRef.current) {
        const lastFocusedId = lastFocusedExerciseIdRef.current;
        const lastFocusedExercise = exercises.find(ex => ex.id === lastFocusedId);
        if (lastFocusedExercise) {
          if (lastFocusedExercise.groupId) {
            const groupMembers = exercises.filter(ex => ex.groupId === lastFocusedExercise.groupId);
            return groupMembers.length >= 2 ? lastFocusedExercise.groupId : lastFocusedExercise.id;
          }
          return lastFocusedExercise.id;
        }
      }
      // Fallback to last exercise
      if (exercises.length > 0) {
        const lastExercise = exercises[exercises.length - 1];
        if (lastExercise) {
          if (lastExercise.groupId) {
            const groupMembers = exercises.filter(ex => ex.groupId === lastExercise.groupId);
            return groupMembers.length >= 2 ? lastExercise.groupId : lastExercise.id;
          }
          return lastExercise.id;
        }
      }
      return null;
    }
    if (focusExercise.groupId) {
      // Check if it's actually a superset (2+ members)
      const groupMembers = exercises.filter(ex => ex.groupId === focusExercise.groupId);
      return groupMembers.length >= 2 ? focusExercise.groupId : focusExercise.id;
    }
    return focusExercise.id;
  })();
  
  // Check if focus exercise is part of a group
  const activeGroupId = focusExercise?.groupId || null;
  const activeGroupMembers = activeGroupId 
    ? exercises.filter(ex => ex.groupId === activeGroupId).sort((a, b) => {
        const indexA = exercises.findIndex(e => e.id === a.id);
        const indexB = exercises.findIndex(e => e.id === b.id);
        return indexA - indexB;
      })
    : [];
  
  // Prefill inputs with last set's values ONLY when focus exercise changes (not when sets change)
  // This prevents clearing inputs when editing sets on completed exercises
  // Weight is stored in kg (canonical), convert to display unit for input
  useEffect(() => {
    if (focusExercise) {
      if (focusExercise.sets.length > 0) {
        const lastSet = focusExercise.sets[focusExercise.sets.length - 1];
        // Convert from kg (canonical) to display unit
        const displayWeight = convertKgToDisplay(lastSet.weight);
        setWeight(displayWeight.toString());
        setReps(lastSet.reps.toString());
      } else {
        // Clear fields when moving to a new exercise (no sets yet)
        setWeight('');
        setReps('');
      }
    }
  }, [focusExercise?.id]); // Only depend on exercise ID, not sets.length
  
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
  // Filter out grouped members - they appear in primary Superset container, not as separate Up Next items
  const progressionIndex = progressionExercise ? exercises.indexOf(progressionExercise) : -1;
  const allUpcoming = progressionExercise && progressionIndex >= 0
    ? exercises.slice(progressionIndex + 1).filter(ex => !ex.isComplete)
    : exercises.filter(ex => !ex.isComplete);
  const upcomingExercises = filterGroupedMembers(allUpcoming);

  // Rest context: determine which exercise/group owns the rest timer
  // Timer is computed from lastSetAt timestamps, persists across navigation
  // Only a lightweight tick to trigger re-render for display updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Lightweight tick every second to update rest timer display
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute rest timer elapsed time from restStartedAtMs timestamp
  const getRestElapsed = (): number => {
    if (!restStartedAtMs) return 0;
    return getElapsedSince(restStartedAtMs, timerNow);
  };

  const restElapsed = getRestElapsed();

  // Sync restOwnerId and restStartedAtMs when exercises change (e.g., when resuming session)
  // If current restOwnerId no longer has lastSetAt, find the new owner
  useEffect(() => {
    if (restOwnerId) {
      // Check if current owner still has a valid lastSetAt
      const groupExercises = exercises.filter(ex => ex.groupId === restOwnerId);
      if (groupExercises.length > 0) {
        // It's a group
        const groupLastSetAt = getGroupLastSetAt(groupExercises);
        if (!groupLastSetAt) {
          // Group no longer has lastSetAt, clear rest owner
          setRestOwnerId(null);
          setRestStartedAtMs(null);
        } else if (restStartedAtMs !== groupLastSetAt) {
          // Update restStartedAtMs to match the group's lastSetAt
          setRestStartedAtMs(groupLastSetAt);
        }
      } else {
        // It's a single exercise
        const exercise = exercises.find(ex => ex.id === restOwnerId);
        if (!exercise || !exercise.lastSetAt) {
          // Exercise no longer has lastSetAt, clear rest owner
          setRestOwnerId(null);
          setRestStartedAtMs(null);
        } else if (restStartedAtMs !== exercise.lastSetAt) {
          // Update restStartedAtMs to match the exercise's lastSetAt
          setRestStartedAtMs(exercise.lastSetAt);
        }
      }
    } else {
      // No current owner, try to find one from persisted data
      let mostRecentTimestamp = 0;
      let ownerId: string | null = null;
      
      // Group exercises by groupId
      const groups = new Map<string, Exercise[]>();
      exercises.forEach(ex => {
        if (ex.groupId) {
          if (!groups.has(ex.groupId)) {
            groups.set(ex.groupId, []);
          }
          groups.get(ex.groupId)!.push(ex);
        }
      });
      
      // Check groups first
      groups.forEach((groupExercises, groupId) => {
        const groupLastSetAt = getGroupLastSetAt(groupExercises);
        if (groupLastSetAt && groupLastSetAt > mostRecentTimestamp) {
          mostRecentTimestamp = groupLastSetAt;
          ownerId = groupId;
        }
      });
      
      // Check single exercises
      exercises.forEach(ex => {
        if (!ex.groupId && ex.lastSetAt && ex.lastSetAt > mostRecentTimestamp) {
          mostRecentTimestamp = ex.lastSetAt;
          ownerId = ex.id;
        }
      });
      
      if (ownerId) {
        setRestOwnerId(ownerId);
        setRestStartedAtMs(mostRecentTimestamp);
      }
    }
  }, [exercises.length, exercises.map(ex => `${ex.id}:${ex.lastSetAt || 0}:${ex.groupId || ''}`).join('|')]);

  const handleAddSet = () => {
    if (!focusExercise) return;
    const wDisplay = parseFloat(weight);
    const r = parseInt(reps);
    // Allow 0 as valid input (for bodyweight exercises, planks, etc.)
    if (weight === '' || reps === '' || isNaN(wDisplay) || isNaN(r) || wDisplay < 0 || r < 0) return;

    // Convert from display unit to kg (canonical) for storage
    const wKg = convertDisplayToKg(wDisplay);
    
    // Get current rest elapsed before logging set (for restDuration)
    const currentRestElapsed = getRestElapsed();
    onAddSet(focusExercise.id, wKg, r, currentRestElapsed > 0 ? currentRestElapsed : undefined);
    
    // Prefill with the set we just added (for next set) - keep in display unit
    setWeight(wDisplay.toString());
    setReps(r.toString());
    
    // Update rest context: this exercise/group now owns the rest timer
    const ownerId = focusExercise.groupId || focusExercise.id;
    setRestOwnerId(ownerId);
    // Update restStartedAtMs to the timestamp of the set we just logged
    setRestStartedAtMs(Date.now());
    if (focusExercise.groupId) {
      setRestOwnerId(focusExercise.groupId);
    } else {
      setRestOwnerId(focusExercise.id);
    }
  };

  const handleDeleteSet = (setId: string) => {
    if (!focusExercise) return;
    onDeleteSet(focusExercise.id, setId);
  };

  const handleCompleteExercise = () => {
    if (!focusExercise) return;
    
    // Clear rest context if this exercise/group owns it
    if (restOwnerId) {
      if (focusExercise.groupId && restOwnerId === focusExercise.groupId) {
        setRestOwnerId(null);
      } else if (!focusExercise.groupId && restOwnerId === focusExercise.id) {
        setRestOwnerId(null);
      }
    }
    
    // If part of a group, complete the whole group
    if (activeGroupId && activeGroupMembers.length > 1 && onCompleteGroup) {
      onCompleteGroup(activeGroupMembers.map(ex => ex.id));
    } else {
      onCompleteExercise(focusExercise.id);
    }
    
    // Auto-advance to next incomplete session item
    const currentItemIndex = sessionItems.findIndex(item => item.id === activeItemId);
    const nextIncompleteItem = sessionItems.slice(currentItemIndex + 1).find(item => !item.isComplete);
    
    if (nextIncompleteItem) {
      // Set active item - use first exercise ID in the item to determine focus
      const firstExerciseId = nextIncompleteItem.exerciseIds[0];
      const nextExercise = exercises.find(ex => ex.id === firstExerciseId);
      if (nextExercise) {
        setProgressionExerciseId(nextExercise.id);
        setInteractionFocusExerciseId(nextExercise.id);
        // Update last focused for UI state persistence
        lastFocusedExerciseIdRef.current = nextExercise.id;
      }
    } else {
      // No more incomplete items - preserve the current focus before clearing
      // Store the exercise that was just completed as the last focused
      if (interactionFocusExerciseId) {
        lastFocusedExerciseIdRef.current = interactionFocusExerciseId;
      }
      setProgressionExerciseId(null);
      setInteractionFocusExerciseId(null);
    }
  };

  const handleSetActiveItem = (itemId: string) => {
    const item = sessionItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Set focus to first exercise in the item
    const firstExerciseId = item.exerciseIds[0];
    const exercise = exercises.find(ex => ex.id === firstExerciseId);
    if (exercise) {
      setInteractionFocusExerciseId(exercise.id);
      // Store as last focused for UI state persistence
      lastFocusedExerciseIdRef.current = exercise.id;
      if (!exercise.isComplete) {
        setProgressionExerciseId(exercise.id);
      }
    }
  };

  // Render inactive card (dulled, minimal info, tappable)
  const renderInactiveItem = (item: SessionItem) => {
    const itemExercises = exercises.filter(ex => item.exerciseIds.includes(ex.id));
    const isCompleted = item.isComplete;
    
    if (item.type === 'superset') {
      // Superset inactive card
      const groupId = item.id;
      const isRestOwner = !isCompleted && restOwnerId === groupId && restStartedAtMs !== null;
      const hasSets = itemExercises.some(ex => ex.sets.length > 0);
      
      return (
        <div className={`px-4 py-4 rounded-lg border transition-all ${
          isCompleted 
            ? 'bg-surface/20 border-border-subtle/50 opacity-50' 
            : 'bg-surface/30 border-border-subtle hover:bg-surface/40 opacity-60'
        }`}>
          <p className={`text-base ${isCompleted ? 'text-text-muted' : 'text-text-primary'}`}>
            Group · {itemExercises.length} exercises
          </p>
          {isRestOwner ? (
            <p className="text-sm text-text-muted mt-0.5">
              Since last set: {formatElapsed(restElapsed)}
            </p>
          ) : hasSets ? (
            // Completed cards show nothing (sets are shown elsewhere via chips)
            null
          ) : (
            <p className="text-sm text-text-muted mt-0.5">Not started</p>
          )}
        </div>
      );
    } else {
      // Single exercise inactive card
      const exercise = itemExercises[0];
      if (!exercise) return null;
      
      const isRestOwner = !isCompleted && restOwnerId === exercise.id && restStartedAtMs !== null;
      const hasSets = exercise.sets.length > 0;
      
      return (
        <div className={`px-4 py-4 rounded-lg border transition-all ${
          isCompleted 
            ? 'bg-surface/20 border-border-subtle/50 opacity-50' 
            : 'bg-surface/30 border-border-subtle hover:bg-surface/40 opacity-60'
        }`}>
          <p className={`text-base ${isCompleted ? 'text-text-muted' : 'text-text-primary'}`}>
            {exercise.name}
          </p>
          {isRestOwner ? (
            <p className="text-sm text-text-muted mt-0.5">
              Since last set: {formatElapsed(restElapsed)}
            </p>
          ) : hasSets ? (
            // Completed cards show nothing (sets are shown elsewhere via chips)
            null
          ) : (
            <p className="text-sm text-text-muted mt-0.5">Not started</p>
          )}
        </div>
      );
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
      // If exercise is part of a group, focus on the group
      if (exercise.groupId) {
        const groupMembers = exercises.filter(ex => ex.groupId === exercise.groupId);
        // Focus on the first member of the group
        const firstMember = groupMembers.sort((a, b) => {
          const indexA = exercises.findIndex(e => e.id === a.id);
          const indexB = exercises.findIndex(e => e.id === b.id);
          return indexA - indexB;
        })[0];
        if (firstMember) {
          setProgressionExerciseId(firstMember.id);
          setInteractionFocusExerciseId(firstMember.id);
          // Update last focused for UI state persistence
          lastFocusedExerciseIdRef.current = firstMember.id;
        }
      } else {
        setProgressionExerciseId(exerciseId);
      }
    }
  };

  const handleEditCompletedExercise = (exerciseId: string) => {
    // Set interaction focus to the completed exercise for editing
    // Do NOT change completion state or progression
    setInteractionFocusExerciseId(exerciseId);
    // Store as last focused for UI state persistence
    lastFocusedExerciseIdRef.current = exerciseId;
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
      // The focus will be set automatically by the useEffect that handles exercise addition
      // But we should clear the stored last focused ID since we're adding a new exercise
      if (!focusExercise) {
        lastFocusedExerciseIdRef.current = null;
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

    const draggedItem = upcomingExercises[draggedIndex];
    const targetItem = upcomingExercises[index];
    
    // Check if hovering over a row (not between rows) for combine
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const rowCenter = rect.top + rect.height / 2;
    const isOverRow = Math.abs(mouseY - rowCenter) < rect.height * 0.4; // Within 40% of row center
    
    if (isOverRow && draggedItem.id !== targetItem.id) {
      // Hovering over a row - check for combine
      if (combineTargetIndex !== index) {
        setCombineTargetIndex(index);
        setHoverStartTime(Date.now());
        
        // Clear existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        
        // Set combine mode after 300ms hover
        hoverTimeoutRef.current = setTimeout(() => {
          setIsCombining(true);
        }, 300);
      }
    } else {
      // Hovering between rows or same row - cancel combine
      if (combineTargetIndex === index) {
        setCombineTargetIndex(null);
        setIsCombining(false);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
      
      // Normal reorder behavior
      if (!isCombining) {
        const reorderedUpcoming = [...upcomingExercises];
        
        // If dragged item is in a group, move the whole group
        if (draggedItem.groupId && onGroupExercises) {
          const groupMembers = upcomingExercises.filter(ex => ex.groupId === draggedItem.groupId);
          // Remove all group members
          groupMembers.forEach(member => {
            const memberIndex = reorderedUpcoming.findIndex(ex => ex.id === member.id);
            if (memberIndex !== -1) {
              reorderedUpcoming.splice(memberIndex, 1);
            }
          });
          // Insert group at target position
          const insertIndex = Math.min(index, reorderedUpcoming.length);
          reorderedUpcoming.splice(insertIndex, 0, ...groupMembers);
        } else {
          // Normal reorder for ungrouped exercise
          reorderedUpcoming.splice(draggedIndex, 1);
          reorderedUpcoming.splice(index, 0, draggedItem);
        }
        
        // Reconstruct full exercise list
        const newExercises = [
          ...completedExercises,
          ...(progressionExercise ? [progressionExercise] : []),
          ...reorderedUpcoming,
        ];
        
        onReorderExercises(newExercises);
        setDraggedIndex(index);
      }
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Handle combine drop
    if (isCombining && combineTargetIndex !== null && draggedIndex !== null) {
      const draggedItem = upcomingExercises[draggedIndex];
      const targetItem = upcomingExercises[combineTargetIndex];
      
      if (draggedItem && targetItem && onGroupExercises && onAddToGroup && onMergeGroups) {
        const draggedGroupInfo = getGroupInfo(exercises, draggedItem.id);
        const targetGroupInfo = getGroupInfo(exercises, targetItem.id);
        
        if (!draggedGroupInfo.groupId && !targetGroupInfo.groupId) {
          // Neither grouped - create new group
          onGroupExercises([draggedItem.id, targetItem.id]);
        } else if (draggedGroupInfo.groupId && !targetGroupInfo.groupId) {
          // Dragged is grouped, target is not - add target to group
          onAddToGroup(draggedGroupInfo.groupId, targetItem.id);
        } else if (!draggedGroupInfo.groupId && targetGroupInfo.groupId) {
          // Target is grouped, dragged is not - add dragged to group
          onAddToGroup(targetGroupInfo.groupId, draggedItem.id);
        } else if (draggedGroupInfo.groupId && targetGroupInfo.groupId) {
          // Both grouped - merge groups
          if (draggedGroupInfo.groupId !== targetGroupInfo.groupId) {
            onMergeGroups(draggedGroupInfo.groupId, targetGroupInfo.groupId);
          }
        }
      }
    }
    
    // Reset drag state
    setDraggedIndex(null);
    setCombineTargetIndex(null);
    setIsCombining(false);
    setIsDraggingOverActive(false);
    setHoverStartTime(null);
  };
  
  const handleDragOverActiveExercise = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || !progressionExercise) return;
    
    setIsDraggingOverActive(true);
    setIsCombining(true);
  };
  
  const handleDragLeaveActiveExercise = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverActive(false);
    setIsCombining(false);
  };
  
  const handleDropOnActiveExercise = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || !progressionExercise || !onGroupExercises || !onAddToGroup || !onMergeGroups) {
      setIsDraggingOverActive(false);
      setIsCombining(false);
      return;
    }
    
    const draggedItem = upcomingExercises[draggedIndex];
    if (!draggedItem) {
      setIsDraggingOverActive(false);
      setIsCombining(false);
      return;
    }
    
    const draggedGroupInfo = getGroupInfo(exercises, draggedItem.id);
    const activeGroupInfo = getGroupInfo(exercises, progressionExercise.id);
    
    if (!draggedGroupInfo.groupId && !activeGroupInfo.groupId) {
      // Neither grouped - create new group
      onGroupExercises([draggedItem.id, progressionExercise.id]);
    } else if (draggedGroupInfo.groupId && !activeGroupInfo.groupId) {
      // Dragged is grouped, active is not - add active to group
      onAddToGroup(draggedGroupInfo.groupId, progressionExercise.id);
    } else if (!draggedGroupInfo.groupId && activeGroupInfo.groupId) {
      // Active is grouped, dragged is not - add dragged to group
      onAddToGroup(activeGroupInfo.groupId, draggedItem.id);
    } else if (draggedGroupInfo.groupId && activeGroupInfo.groupId) {
      // Both grouped - merge groups
      if (draggedGroupInfo.groupId !== activeGroupInfo.groupId) {
        onMergeGroups(draggedGroupInfo.groupId, activeGroupInfo.groupId);
      }
    }
    
    setIsDraggingOverActive(false);
    setIsCombining(false);
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

  // When all exercises are complete, ensure we have a focus so the session screen remains visible
  // Use the last focused exercise, or fall back to the last exercise in the list
  useEffect(() => {
    if (!focusExercise && exercises.length > 0) {
      // All exercises are complete - set focus to last exercise or stored last focused
      if (lastFocusedExerciseIdRef.current) {
        const lastFocusedId = lastFocusedExerciseIdRef.current;
        const lastFocusedExercise = exercises.find(ex => ex.id === lastFocusedId);
        if (lastFocusedExercise) {
          setInteractionFocusExerciseId(lastFocusedId);
          return;
        }
      }
      // Fallback to last exercise
      const lastExercise = exercises[exercises.length - 1];
      if (lastExercise) {
        setInteractionFocusExerciseId(lastExercise.id);
        lastFocusedExerciseIdRef.current = lastExercise.id;
      }
    }
  }, [focusExercise, exercises]);

  // Render active item (full controls visible)
  const renderActiveItem = (item: SessionItem) => {
    if (item.type === 'superset' && item.exerciseIds.length >= 2 && onAddSupersetSet && onCompleteGroup) {
      // Active superset block
      const groupId = item.id;
      return (
        <SupersetBlock
          groupId={groupId}
          exercises={exercises}
          lastSessionData={lastSessionData}
          allWorkouts={allWorkouts}
          onAddSet={onAddSupersetSet}
          onCompleteGroup={onCompleteGroup}
          onDeleteSet={onDeleteSet}
          restOwnerId={restOwnerId === groupId ? groupId : null}
          restElapsed={restOwnerId === groupId ? restElapsed : 0}
          onRestTimerChange={(ownerId) => {
            setRestOwnerId(ownerId);
            if (ownerId) {
              // Find the timestamp for the owner
              const groupExercises = exercises.filter(ex => ex.groupId === ownerId);
              if (groupExercises.length > 0) {
                const groupLastSetAt = getGroupLastSetAt(groupExercises);
                setRestStartedAtMs(groupLastSetAt);
              } else {
                const exercise = exercises.find(ex => ex.id === ownerId);
                setRestStartedAtMs(exercise?.lastSetAt || null);
              }
            } else {
              setRestStartedAtMs(null);
            }
          }}
          nowMs={timerNow}
          onAddToGroup={() => {
            setActiveGroupIdForManagement(groupId);
            setShowPairAnother(true);
            // Set focus to first member of group for PairWithSheet
            const firstMember = exercises.find(ex => ex.groupId === groupId);
            if (firstMember) {
              setInteractionFocusExerciseId(firstMember.id);
            }
          }}
          onRemoveFromGroup={(exerciseId) => {
            if (onUngroup) {
              onUngroup(exerciseId);
            }
            // Check if group should be dissolved
            const remainingMembers = exercises.filter(
              ex => ex.groupId === groupId && ex.id !== exerciseId
            );
            if (remainingMembers.length < 2) {
              // Dissolve group - ungroup remaining member
              remainingMembers.forEach(member => {
                if (onUngroup) {
                  onUngroup(member.id);
                }
              });
            }
          }}
          onSwapExerciseInGroup={(exerciseId) => {
            setActiveGroupIdForManagement(groupId);
            setExerciseToSwapId(exerciseId);
            setShowSwapExerciseInSuperset(true);
          }}
          onSkipExerciseInGroup={(exerciseId) => {
            onSkipExercise(exerciseId);
          }}
          onUpdateSet={onUpdateSet}
          onSelectSet={(exerciseId, setId, setIndex) => {
            // Set focus to this exercise so it remains active/expanded during editing
            const exercise = exercises.find(ex => ex.id === exerciseId);
            if (exercise) {
              setInteractionFocusExerciseId(exerciseId);
            }
            setSelectedSetId(setId);
            setSelectedSetExerciseId(exerciseId);
            setShowManageSetSheet(true);
          }}
        />
      );
    } else {
      // Active single exercise card
      const exerciseId = item.exerciseIds[0];
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return null;

      return (
        <div className="bg-surface rounded-2xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{exercise.name}</h2>
            {!exercise.isComplete && (
              <button 
                onClick={() => {
                  setOverflowExerciseId(exercise.id);
                  setShowExerciseOverflowSheet(true);
                }}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface/50"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Set logging inputs */}
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
              {exercise.sets.length > 0 && (
                exercise.isComplete ? (
                  // Muted "Done" state for completed exercises
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted bg-surface/50 rounded-lg border border-border-subtle">
                    <Check className="w-4 h-4" />
                    <span>Done</span>
                  </div>
                ) : (
                  // Active "Done" button for incomplete exercises
                  <Button
                    variant="neutral"
                    onClick={handleCompleteExercise}
                    disabled={exercise.sets.length === 0}
                  >
                    <Check className="w-4 h-4 mr-2 inline" />
                    Done
                  </Button>
                )
              )}
            </div>

            {/* Last session chips - below inputs (only shown when no sets logged yet) */}
            {/* Visibility: ONLY show when exercise has 0 committed sets in current session */}
            {/* Data source: lastSessionData is strictly from previous completed sessions, never current session */}
            {exercise.sets.length === 0 && (() => {
              const lastData = lastSessionData.get(exercise.name);
              // Defensive check: ensure lastData exists and has valid sets from previous session
              if (!lastData || !lastData.sets || !lastData.sets.length) return null;
              
              // Create defensive copy to prevent any mutation
              const lastSessionCopy = {
                sets: [...lastData.sets], // Copy array to prevent mutation
                date: lastData.date,
              };
              
              // Get comparison flag
              const comparisonFlag = getComparisonFlag(exercise.name, allWorkouts);
              
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
                  onLabelPress={() => {
                    setHistoryExerciseName(exercise.name);
                    setShowHistorySheet(true);
                  }}
                  comparisonFlag={comparisonFlag.show ? comparisonFlag.message : null}
                  showChevron={false}
                />
              );
            })()}
          </div>

          {/* Large "Since last set" section - shown only when this exercise is the rest owner and expanded */}
          {restOwnerId === exercise.id && !exercise.isComplete && restStartedAtMs !== null && (
            <div className="flex items-center justify-between px-3 py-2 bg-surface/50 rounded-lg border border-border-subtle">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Since last set</p>
                  <p className="text-lg tabular-nums">
                    {formatRestTime(restElapsed)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  // Clear rest context for this exercise
                  setRestOwnerId(null);
                  setRestStartedAtMs(null);
                }}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sets list - directly below timer (only shown when sets exist) */}
          {exercise.sets.length > 0 && (
            <CompletedSetsPanel
              sets={exercise.sets}
              onSelectSet={(setId, setIndex) => {
                // Set focus to this exercise so it remains active/expanded during editing
                setInteractionFocusExerciseId(exercise.id);
                setSelectedSetId(setId);
                setSelectedSetExerciseId(exercise.id);
                setShowManageSetSheet(true);
              }}
              exerciseId={exercise.id}
            />
          )}
        </div>
      );
    }
  };

  // Render finish button section (minimal tail section)
  // Button prominence: Log set > Done > Finish workout > Add exercise
  const renderControlsSection = () => {
    return (
      <div className="pt-4 space-y-3">
        <Button
          variant="neutral"
          onClick={() => setShowFinishConfirmation(true)}
          className="w-full"
        >
          Finish workout
        </Button>
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full text-sm text-text-muted border border-border-subtle rounded-lg py-2.5 px-4 bg-transparent hover:bg-surface/40 hover:border-border-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          Add exercise
        </button>
      </div>
    );
  };

  // Compute workout title based on period of day (stable for session)
  // Only show title when session has multiple exercise slots (workout, not single exercise)
  // Reuse sessionItems computed earlier in the component
  const slotCount = sessionItems.length;
  const workoutTitle = (startedAt && slotCount > 1) ? formatWorkoutTitle(startedAt) : undefined;

  return (
    <div className="h-screen flex flex-col bg-panel">
      <TopBar
        title={workoutTitle}
        onBack={onBack}
        rightAction={
          startedAt ? (
            <div className="text-sm tabular-nums text-text-muted">
              {elapsedLabel}
            </div>
          ) : null
        }
      />
      
      {exercises.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-text-muted mb-4">No exercises yet</p>
            <Button variant="primary" onClick={() => setShowAddExercise(true)}>
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Exercise
            </Button>
          </div>
        </div>
      ) : (
        <SessionScrollLayout
          items={sessionItems}
          activeItemId={activeItemId}
          onSetActiveItem={handleSetActiveItem}
          renderActiveItem={renderActiveItem}
          renderInactiveItem={renderInactiveItem}
          renderControlsSection={renderControlsSection}
        />
      )}

      {/* Add Exercise Bottom Sheet */}
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

      {/* Pair With Bottom Sheet */}
      {focusExercise && onGroupExercises && (
        <PairWithSheet
          isOpen={showPairWith}
          onClose={() => {
            setShowPairWith(false);
            // Restore focus to progression exercise after closing
            if (progressionExercise) {
              setInteractionFocusExerciseId(progressionExercise.id);
            }
          }}
          activeExercise={focusExercise}
          allExercises={exercises}
          onSelectExercise={(exerciseId) => {
            const selectedExercise = exercises.find(ex => ex.id === exerciseId);
            if (!selectedExercise) return;
            
            const activeGroupInfo = getGroupInfo(exercises, focusExercise.id);
            const selectedGroupInfo = getGroupInfo(exercises, exerciseId);
            
            if (!activeGroupInfo.groupId && !selectedGroupInfo.groupId) {
              // Neither is grouped - create new group
              if (onGroupExercises) {
                onGroupExercises([focusExercise.id, exerciseId]);
              }
            } else if (activeGroupInfo.groupId && !selectedGroupInfo.groupId) {
              // Active is grouped, selected is not - add to group
              if (onAddToGroup) {
                onAddToGroup(activeGroupInfo.groupId, exerciseId);
              }
            } else if (!activeGroupInfo.groupId && selectedGroupInfo.groupId) {
              // Selected is grouped, active is not - add to group
              if (onAddToGroup) {
                onAddToGroup(selectedGroupInfo.groupId, focusExercise.id);
              }
            } else if (activeGroupInfo.groupId && selectedGroupInfo.groupId) {
              // Both are grouped - merge groups
              if (onMergeGroups && activeGroupInfo.groupId !== selectedGroupInfo.groupId) {
                onMergeGroups(activeGroupInfo.groupId, selectedGroupInfo.groupId);
              }
            }
          }}
          onAddNewExerciseAndPair={(exerciseName) => {
            // Add exercise and pair it with the active exercise
            if (focusExercise) {
              onAddExercise(exerciseName, focusExercise.id);
            } else {
              onAddExercise(exerciseName);
            }
          }}
        />
      )}

      {/* Swap Exercise Bottom Sheet */}
      {focusExercise && (
        <ExerciseSearchBottomSheet
          isOpen={showSwapExercise}
          onClose={() => setShowSwapExercise(false)}
          title={`Swap "${focusExercise.name}"`}
        >
          <ExerciseSearch
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

      {/* Pair Another Sheet for Superset */}
      {activeGroupIdForManagement && focusExercise && (
        <PairWithSheet
          isOpen={showPairAnother}
          onClose={() => {
            setShowPairAnother(false);
            setActiveGroupIdForManagement(null);
          }}
          activeExercise={focusExercise}
          allExercises={exercises}
          onSelectExercise={(exerciseId) => {
            if (onAddToGroup && activeGroupIdForManagement) {
              onAddToGroup(activeGroupIdForManagement, exerciseId);
            }
            setShowPairAnother(false);
            setActiveGroupIdForManagement(null);
          }}
          onAddNewExerciseAndPair={(exerciseName) => {
            if (activeGroupIdForManagement) {
              onAddExercise(exerciseName, activeGroupIdForManagement);
            }
            setShowPairAnother(false);
            setActiveGroupIdForManagement(null);
          }}
        />
      )}

      {/* Swap Exercise in Superset Sheet */}
      {activeGroupIdForManagement && (
        <SwapExerciseSheet
          isOpen={showSwapExerciseInSuperset}
          onClose={() => {
            setShowSwapExerciseInSuperset(false);
            setActiveGroupIdForManagement(null);
            setExerciseToSwapId(null);
          }}
          groupMembers={exercises.filter(ex => ex.groupId === activeGroupIdForManagement)}
          allExercises={exercises}
          initialExerciseToReplace={exerciseToSwapId || undefined}
          onSwapWithExisting={(exerciseIdToReplace, replacementExerciseId) => {
            // Check if replacement is already grouped
            const replacement = exercises.find(ex => ex.id === replacementExerciseId);
            if (replacement && replacement.groupId) {
              // Show error - replacement is already in a group
              // TODO: Show toast/error message "Already in a group"
              console.warn('[SwapExercise] Replacement is already in a group', {
                replacementExerciseId,
                existingGroupId: replacement.groupId,
              });
              return; // Don't proceed with swap
            }
            
            // Use dedicated swap function
            if (onSwapGroupMember && activeGroupIdForManagement && exerciseIdToReplace) {
              onSwapGroupMember(activeGroupIdForManagement, exerciseIdToReplace, replacementExerciseId);
            }
            setShowSwapExerciseInSuperset(false);
            setActiveGroupIdForManagement(null);
            setExerciseToSwapId(null);
          }}
          onAddNewExerciseAndSwap={(exerciseIdToReplace, newExerciseName) => {
            // Add new exercise and swap it in atomically
            if (activeGroupIdForManagement && exerciseIdToReplace) {
              onAddExercise(newExerciseName, undefined, exerciseIdToReplace, activeGroupIdForManagement);
            }
            setShowSwapExerciseInSuperset(false);
            setActiveGroupIdForManagement(null);
            setExerciseToSwapId(null);
          }}
        />
      )}

      {/* Standalone exercise overflow bottom sheet */}
      {overflowExerciseId && (
        <CompactBottomSheet
          isOpen={showExerciseOverflowSheet}
          onClose={() => {
            setShowExerciseOverflowSheet(false);
            setOverflowExerciseId(null);
          }}
        >
          {(() => {
            const exercise = exercises.find(ex => ex.id === overflowExerciseId);
            if (!exercise) return null;
            
            const groupInfo = getGroupInfo(exercises, exercise.id);
            const actions = [
              {
                label: 'Swap exercise',
                icon: ArrowRightLeft,
                onPress: () => {
                  setShowSwapExercise(true);
                  setShowExerciseOverflowSheet(false);
                  setOverflowExerciseId(null);
                },
              },
            ];
            
            // Pair with (conditional: only if grouping is supported and exercise is not already in a group)
            if (onGroupExercises && !groupInfo.groupId) {
              actions.push({
                label: 'Pair with',
                icon: Link2,
                onPress: () => {
                  setShowPairWith(true);
                  setShowExerciseOverflowSheet(false);
                  setOverflowExerciseId(null);
                },
              });
            }
            
            // Unpair (if exercise is already in a group)
            if (onGroupExercises && groupInfo.groupId && onUngroup) {
              actions.push({
                label: 'Unpair',
                icon: X,
                onPress: () => {
                  onUngroup(exercise.id);
                  setShowExerciseOverflowSheet(false);
                  setOverflowExerciseId(null);
                },
              });
            }
            
            actions.push(
              {
                label: 'Defer to end',
                icon: ListEnd,
                onPress: () => {
                  handleDeferExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                  setOverflowExerciseId(null);
                },
              },
              {
                label: 'Skip exercise',
                icon: SkipForward,
                onPress: () => {
                  handleSkipExercise(exercise.id);
                  setShowExerciseOverflowSheet(false);
                  setOverflowExerciseId(null);
                },
              }
            );
            
            return <OverflowActionGroup actions={actions} />;
          })()}
        </CompactBottomSheet>
      )}

      {/* Manage Set Sheet */}
      {selectedSetId && selectedSetExerciseId && (() => {
        const exercise = exercises.find(ex => ex.id === selectedSetExerciseId);
        const set = exercise?.sets.find(s => s.id === selectedSetId);
        if (!exercise || !set) return null;
        const setIndex = exercise.sets.findIndex(s => s.id === selectedSetId);
        return (
          <ManageSetSheet
            isOpen={showManageSetSheet}
            onClose={() => {
              setShowManageSetSheet(false);
              setSelectedSetId(null);
              setSelectedSetExerciseId(null);
            }}
            exerciseId={selectedSetExerciseId}
            set={set}
            setIndex={setIndex}
            onUpdateSet={onUpdateSet || (() => {})}
            onDeleteSet={onDeleteSet}
          />
        );
      })()}

      {/* Remove Exercise from Superset Sheet */}
      {activeGroupIdForManagement && (
        <RemoveExerciseSheet
          isOpen={showRemoveExercise}
          onClose={() => {
            setShowRemoveExercise(false);
            setActiveGroupIdForManagement(null);
          }}
          groupMembers={exercises.filter(ex => ex.groupId === activeGroupIdForManagement)}
          onConfirm={(exerciseIdsToRemove) => {
            exerciseIdsToRemove.forEach(exerciseId => {
              if (onUngroup) {
                onUngroup(exerciseId);
              }
            });
            
            // Check if group should be dissolved
            const remainingMembers = exercises.filter(
              ex => ex.groupId === activeGroupIdForManagement && !exerciseIdsToRemove.includes(ex.id)
            );
            
            if (remainingMembers.length < 2) {
              // Dissolve group - ungroup remaining member
              remainingMembers.forEach(member => {
                if (onUngroup) {
                  onUngroup(member.id);
                }
              });
            }
            
            setShowRemoveExercise(false);
            setActiveGroupIdForManagement(null);
          }}
        />
      )}

      {/* Exercise History Bottom Sheet */}
      {historyExerciseName && (
        <ExerciseHistoryBottomSheet
          isOpen={showHistorySheet}
          onClose={() => {
            setShowHistorySheet(false);
            setHistoryExerciseName(null);
          }}
          exerciseName={historyExerciseName}
          sessions={getRecentSessionsForExercise(historyExerciseName, allWorkouts, 4)}
          onChipPress={(chipWeightKg, chipReps) => {
            // Chip tap prefills draft inputs and closes sheet
            const displayWeight = convertKgToDisplay(chipWeightKg);
            setWeight(displayWeight.toString());
            setReps(chipReps.toString());
            setShowHistorySheet(false);
            setHistoryExerciseName(null);
          }}
        />
      )}

      {/* Finish Workout Confirmation Bottom Sheet */}
      <CompactBottomSheet
        isOpen={showFinishConfirmation}
        onClose={() => setShowFinishConfirmation(false)}
        title="Finish workout?"
        hideCloseButton={true}
      >
        <div className="space-y-4">
          <OverflowActionGroup
            actions={[
              {
                label: 'Finish',
                onPress: () => {
                  setShowFinishConfirmation(false);
                  onFinishWorkout();
                },
              },
              {
                label: 'Keep logging',
                onPress: () => {
                  setShowFinishConfirmation(false);
                },
              },
            ]}
          />
        </div>
      </CompactBottomSheet>
    </div>
  );
}
