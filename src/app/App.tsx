import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Edit2, List } from 'lucide-react';
import { HomeScreen } from './screens/HomeScreen';
import { CreateWorkoutScreen } from './screens/CreateWorkoutScreen';
import { ViewTemplateScreen } from './screens/ViewTemplateScreen';
import { WorkoutSessionScreen } from './screens/WorkoutSessionScreen';
import { ExerciseSessionScreen } from './screens/ExerciseSessionScreen';
import { WorkoutSummaryScreen } from './screens/WorkoutSummaryScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BackupsAndDataScreen } from './screens/BackupsAndDataScreen';
import { StartLoggingScreen } from './screens/StartLoggingScreen';
import { ExerciseSearchScreen } from './screens/ExerciseSearchScreen';
import { Banner } from './components/Banner';
import { Modal } from './components/Modal';
import { SessionConflictModal } from './components/SessionConflictModal';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Workout, Exercise, Screen, AdHocLoggingSession } from './types';
import { WorkoutTemplate } from './types/templates';
import { IncompleteExerciseSession } from './types';
import { saveWorkouts, loadWorkouts, getUnfinishedWorkout, getWorkoutHistory, getLastSessionForExercise, saveIncompleteExerciseSession, loadIncompleteExerciseSession, saveIncompleteWorkoutId, loadIncompleteWorkoutId, saveAdHocLoggingSession, loadAdHocLoggingSession, getActiveAdHocSession } from './utils/storage';
import { loadTemplates, saveTemplate, deleteTemplate, saveTemplates } from './utils/templateStorage';
import { loadState } from './storage/storageGateway';
import { DataRecoveryScreen } from './components/DataRecoveryScreen';
import { addExerciseToDb, loadExercisesDB, searchExercises, initializeExerciseDatabase, ExerciseDBEntry, getAllExercisesList } from './utils/exerciseDb';
import { updateSessionClassificationAndName, generateDefaultSessionName } from './utils/sessionNaming';
import { saveWorkout, deleteWorkouts as deleteWorkoutsApi } from './utils/api';
import { recordSwap } from '../utils/exerciseSwapHistory';
import { loadPreferences, getAppearance, setAppearance } from '../utils/preferences';
import { createGroup, addToGroup, mergeGroups, ungroup, ungroupAll, applyGroupingToSession, swapGroupMember } from './utils/exerciseGrouping';
import { computeDurationSec } from './utils/duration';
import { Toaster, toast } from 'sonner';


type AppScreen = 
  | { type: 'home' }
  | { type: 'create-template' }
  | { type: 'view-template'; templateId: string }
  | { type: 'workout-session'; workoutId: string }
  | { type: 'exercise-session'; exerciseName: string; previousScreen?: AppScreen }
  | { type: 'workout-summary'; workoutId: string; isJustCompleted?: boolean; isSingleExercise?: boolean; previousScreen?: AppScreen }
  | { type: 'exercise-history'; exerciseName: string; previousScreen?: AppScreen }
  | { type: 'history'; searchQuery?: string; scrollPosition?: number; restoreKey?: number }
  | { type: 'settings'; previousScreen?: AppScreen }
  | { type: 'backups-and-data'; previousScreen?: AppScreen }
  | { type: 'start-logging' }
  | { type: 'ad-hoc-session'; sessionId: string };

export default function App() {
  // Initialize state with recovery handling
  const [storageError, setStorageError] = useState<{ error: string; rawData?: string } | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [incompleteExerciseSession, setIncompleteExerciseSession] = useState<IncompleteExerciseSession | null>(null);
  const [adHocSession, setAdHocSession] = useState<AdHocLoggingSession | null>(null);
  const [stateHydrated, setStateHydrated] = useState(false);

  // Initialize app state on mount
  useEffect(() => {
    const result = loadState();
    if (result.success && result.state) {
      setWorkouts(result.state.workouts || []);
      setTemplates(result.state.templates || []);
      setIncompleteExerciseSession(result.state.incompleteExerciseSession ?? null);
      setAdHocSession(result.state.adHocSession ?? null);
      setStorageError(null);
    } else {
      // Load failed - show recovery screen
      setStorageError({
        error: result.error || 'Unknown error loading data',
        rawData: result.rawData,
      });
    }
    setStateHydrated(true);
  }, []);
  
  const [screen, setScreen] = useState<AppScreen>({ type: 'home' });
  const [banner, setBanner] = useState<{ message: string; variant: 'info' | 'warning' | 'error' } | null>(null);
  const [showLogExercise, setShowLogExercise] = useState(false);
  const [exerciseSearchOverlay, setExerciseSearchOverlay] = useState<{
    title: string;
    onSelect: (name: string) => void;
    onBack: () => void;
    selectedExercises?: string[];
    onAddNewExercise?: (name: string) => void;
    inSessionExercises?: string[];
    mode?: 'ADD_TO_SESSION' | 'PICK_PAIR_TARGET' | 'SWAP' | 'DEFAULT';
    createButtonLabel?: string;
    swapContext?: { originalExercise: { id: string; name: string; source: string; primaryMuscles?: string[]; secondaryMuscles?: string[]; equipment?: string[] } };
  } | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSessionSets, setExerciseSessionSets] = useState<any[]>([]);
  const [showExerciseComplete, setShowExerciseComplete] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishWorkoutId, setFinishWorkoutId] = useState<string | null>(null);
  // Load preferences on mount
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [unitChangeKey, setUnitChangeKey] = useState(0); // Trigger re-renders when units change
  
  const handleUnitChange = () => {
    setUnitChangeKey(prev => prev + 1);
  };
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Load from preferences first, fallback to old localStorage key, then default to dark
    const prefs = loadPreferences();
    if (prefs.appearance) {
      return prefs.appearance;
    }
    const savedTheme = localStorage.getItem('workout-app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Default to dark mode for first-time users
    return 'dark';
  });

  // Initialize preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    // Sync theme with preferences
    if (prefs.appearance && prefs.appearance !== theme) {
      setTheme(prefs.appearance);
    }
    setPreferencesLoaded(true);
  }, []);
  
  // Session conflict state
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'workout' | 'exercise';
    data: any;
  } | null>(null);

  // Sync showLogExercise to exercise search overlay (for callers that still use setShowLogExercise)
  useEffect(() => {
    if (showLogExercise && !exerciseSearchOverlay) {
      setShowLogExercise(false);
      setExerciseSearchOverlay({
        title: 'Log Exercise',
        onSelect: (name) => {
          handleLogExerciseFromModal(name);
          setExerciseSearchOverlay(null);
        },
        onBack: () => setExerciseSearchOverlay(null),
        onAddNewExercise: (name) => {
          handleAddNewExerciseFromModal(name);
          setExerciseSearchOverlay(null);
        },
        createButtonLabel: 'Create & start',
      });
    }
  }, [showLogExercise]);

  // Redirect ad-hoc-session to Home when session is invalid (avoids setState-during-render)
  useEffect(() => {
    if (screen.type === 'ad-hoc-session') {
      const session = adHocSession;
      const sessionId = screen.sessionId;
      if (!session || session.id !== sessionId) {
        setScreen({ type: 'home' });
      }
    }
  }, [screen.type, screen.type === 'ad-hoc-session' ? screen.sessionId : undefined, adHocSession]);

  // Initialize exercise database on app startup
  useEffect(() => {
    initializeExerciseDatabase();
  }, []);

  // Apply theme to document root and sync with preferences
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    // Save theme preference (both old key for backward compat and new preferences system)
    localStorage.setItem('workout-app-theme', theme);
    if (preferencesLoaded) {
      setAppearance(theme);
    }
  }, [theme, preferencesLoaded]);

  // Save incomplete exercise session to localStorage whenever it changes
  useEffect(() => {
    saveIncompleteExerciseSession(incompleteExerciseSession);
  }, [incompleteExerciseSession]);

  // Persist workouts to localStorage whenever they change
  useEffect(() => {
    saveWorkouts(workouts);
  }, [workouts]);

  // Persist templates to localStorage whenever they change
  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  // Persist ad-hoc session to localStorage whenever it changes
  useEffect(() => {
    saveAdHocLoggingSession(adHocSession);
  }, [adHocSession]);

  const unfinishedWorkout = getUnfinishedWorkout(workouts);
  const workoutHistory = getWorkoutHistory(workouts);

  // Template management
  const handleSaveTemplate = (name: string, exerciseNames: string[]) => {
    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name,
      exerciseNames,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveTemplate(newTemplate);
    setTemplates([...templates, newTemplate]);
    setBanner({ message: `Saved \"${name}\"`, variant: 'info' });
    setScreen({ type: 'home' });
  };

  // Check for session conflicts before starting new workout/exercise
  const checkSessionConflict = (action: () => void, actionType: 'workout' | 'exercise', actionData: any) => {
    // Check for incomplete exercise session
    if (incompleteExerciseSession) {
      setPendingAction({ type: actionType, data: actionData });
      setShowSessionConflict(true);
      return;
    }
    
    // Check for unfinished workout
    if (unfinishedWorkout) {
      setPendingAction({ type: actionType, data: actionData });
      setShowSessionConflict(true);
      return;
    }
    
    // No conflicts, proceed with action
    action();
  };

  const handleResumeConflictSession = () => {
    setShowSessionConflict(false);
    setPendingAction(null);
    
    // Resume whichever session exists
    if (incompleteExerciseSession) {
      resumeExerciseSession();
    } else if (unfinishedWorkout) {
      // Double-check the workout exists in the workouts array before navigating
      const workoutExists = workouts.find(w => w.id === unfinishedWorkout.id);
      if (workoutExists) {
        setScreen({ type: 'workout-session', workoutId: unfinishedWorkout.id });
      } else {
        console.error('Cannot resume workout - not found in workouts array:', unfinishedWorkout.id);
        setBanner({ message: 'Workout not found', variant: 'error' });
      }
    }
  };

  const handleDiscardConflictSession = () => {
    // Discard existing session
    if (incompleteExerciseSession) {
      setIncompleteExerciseSession(null);
    }
    if (unfinishedWorkout) {
      discardWorkout(unfinishedWorkout.id);
    }
    
    // Execute pending action
    if (pendingAction) {
      executePendingAction();
    }
    
    setShowSessionConflict(false);
    setPendingAction(null);
  };

  /**
   * Finalize in-progress session (DATA ONLY - no navigation side-effects)
   * Returns banner message if session was finalized, null if no session existed
   */
  const finalizeInProgressSession = (): { message: string; variant: 'info' } | null => {
    let bannerMessage: { message: string; variant: 'info' } | null = null;
    
    // Handle single exercise session
    if (incompleteExerciseSession) {
      const hasSets = incompleteExerciseSession.sets.length > 0;
      
      if (hasSets) {
        // Save: meaningful work exists (has sets)
        const endedAt = Date.now();
        const startedAt = incompleteExerciseSession.startedAt || incompleteExerciseSession.startTime || endedAt;
        const workout: Workout = {
          id: Date.now().toString(),
          name: incompleteExerciseSession.exerciseName,
          exercises: [{
            id: Date.now().toString(),
            name: incompleteExerciseSession.exerciseName,
            sets: incompleteExerciseSession.sets,
            isComplete: true,
          }],
          startTime: incompleteExerciseSession.startTime || Date.now(),
          endTime: endedAt,
          startedAt,
          endedAt,
          durationSec: computeDurationSec(startedAt, endedAt),
          isComplete: true,
        };
        setWorkouts([...workouts, workout]);
        bannerMessage = { message: 'Previous exercise saved', variant: 'info' };
      } else {
        // Discard: empty session (0 sets)
        bannerMessage = { message: 'Previous exercise discarded (0 sets)', variant: 'info' };
      }
      
      // Clear incomplete session state
      setIncompleteExerciseSession(null);
      setExerciseSessionSets([]);
      // Note: We do NOT navigate here - navigation is handled by the caller
      // This ensures we don't accidentally navigate to completion screen
    }
    
    // Handle workout session
    if (unfinishedWorkout) {
      const workout = workouts.find(w => w.id === unfinishedWorkout.id);
      if (workout) {
        // Check for meaningful work:
        // - At least one set logged, OR
        // - At least one exercise marked as complete
        const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const hasCompletedExercise = workout.exercises.some(ex => ex.isComplete);
        const hasMeaningfulWork = totalSets > 0 || hasCompletedExercise;
        
        if (hasMeaningfulWork) {
          // Save: meaningful work exists
          // Remove exercises with no sets, mark as complete
          const exercisesWithSets = workout.exercises.filter(ex => ex.sets.length > 0);
          const endedAt = Date.now();
          setWorkouts(workouts.map(w => {
            if (w.id === workout.id) {
              const startedAt = w.startedAt || w.startTime || endedAt;
              return {
                ...w,
                exercises: exercisesWithSets,
                isComplete: true,
                endTime: endedAt,
                startedAt,
                endedAt,
                durationSec: w.durationSec ?? computeDurationSec(startedAt, endedAt),
              };
            }
            return w;
          }));
          saveIncompleteWorkoutId(null);
          bannerMessage = { message: 'Previous workout saved', variant: 'info' };
        } else {
          // Discard: empty session (0 sets AND 0 completed exercises)
          setWorkouts(workouts.filter(w => w.id !== workout.id));
          saveIncompleteWorkoutId(null);
          bannerMessage = { message: 'Previous workout discarded (0 sets)', variant: 'info' };
        }
      }
    }
    
    return bannerMessage;
  };

  /**
   * Handle "Start New" when a session is already in progress.
   * 
   * Behavior:
   * - Finalize in-progress session (save or discard)
   * - Show appropriate banner message
   * - Create and navigate to new session
   */
  const handleSaveAndContinueConflictSession = () => {
    // Finalize in-progress session (data only, no navigation)
    const banner = finalizeInProgressSession();
    if (banner) {
      setBanner(banner);
    }
    
    // Clear the conflict modal state first
    setShowSessionConflict(false);
    const actionToExecute = pendingAction;
    setPendingAction(null);
    
    // Execute pending action (start new workout/exercise)
    // Use setTimeout to ensure state updates from finalizeInProgressSession have been applied
    // This prevents race conditions where the new workout might not be found
    if (actionToExecute) {
      setTimeout(() => {
        executePendingActionWithContext(actionToExecute);
      }, 0);
    }
  };

  const executePendingActionWithContext = (action: typeof pendingAction) => {
    if (!action) return;
    
    if (action.type === 'workout') {
      if (action.data.type === 'template') {
        handleStartTemplateInternal(action.data.templateId);
      } else if (action.data.type === 'quick') {
        handleQuickStartInternal();
      } else if (action.data.type === 'named') {
        createWorkoutInternal(action.data.name);
      } else if (action.data.type === 'history') {
        startWorkoutFromHistoryInternal(action.data.workoutId);
      }
    } else if (action.type === 'exercise') {
      startExerciseSessionInternal(action.data.exerciseName);
    }
  };

  const executePendingAction = () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'workout') {
      if (pendingAction.data.type === 'template') {
        handleStartTemplateInternal(pendingAction.data.templateId);
      } else if (pendingAction.data.type === 'quick') {
        handleQuickStartInternal();
      } else if (pendingAction.data.type === 'named') {
        createWorkoutInternal(pendingAction.data.name);
      } else if (pendingAction.data.type === 'history') {
        startWorkoutFromHistoryInternal(pendingAction.data.workoutId);
      }
    } else if (pendingAction.type === 'exercise') {
      startExerciseSessionInternal(pendingAction.data.exerciseName);
    }
  };

  // Internal versions that don't check conflicts
  const handleStartTemplateInternal = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      if (import.meta.env.DEV) {
        console.error('[App] Template not found for templateId:', templateId);
      }
      return;
    }

    // Use a more unique ID to avoid conflicts with workouts created by finalizeInProgressSession
    const workoutId = `${Date.now()}-${Math.random()}`;
    const now = Date.now();
    const newWorkout: Workout = {
      id: workoutId,
      name: template.name,
      exercises: template.exerciseNames.map((name, idx) => ({
        id: `${workoutId}-ex-${idx}-${Math.random()}`,
        name,
        sets: [],
        isComplete: false,
      })),
      startTime: now, // Track when workout was created, but don't start timer yet
      // Do NOT set startedAt - timer starts when first set is logged
      isComplete: false,
      templateId: templateId, // Store template reference for duration estimation
    };
    
    if (import.meta.env.DEV) {
      console.log('[App] Creating new workout:', {
        id: newWorkout.id,
        name: newWorkout.name,
        exerciseCount: newWorkout.exercises.length,
        exercises: newWorkout.exercises.map(ex => ({ name: ex.name, isComplete: ex.isComplete, sets: ex.sets.length }))
      });
    }
    
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  const handleQuickStartInternal = () => {
    const now = Date.now();
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: 'Quick Workout',
      exercises: [],
      startTime: now, // Track when workout was created, but don't start timer yet
      // Do NOT set startedAt - timer starts when first set is logged
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  const createWorkoutInternal = (name: string) => {
    const now = Date.now();
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name,
      exercises: [],
      startTime: now, // Track when workout was created, but don't start timer yet
      // Do NOT set startedAt - timer starts when first set is logged
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  /**
   * Start the workout timer when the first exercise is logged.
   * This is idempotent - it only sets startedAt if it hasn't been set yet.
   * 
   * This should be called when:
   * - First set is added to a workout
   * - First set is added to an exercise session
   * - First set is added to an ad-hoc session
   */
  const beginFirstExerciseLog = () => {
    // Check workout sessions
    const unfinished = getUnfinishedWorkout(workouts);
    if (unfinished) {
      const workout = workouts.find(w => w.id === unfinished.id);
      if (workout && !workout.startedAt) {
        const startedAt = workout.startTime || Date.now();
        setWorkouts(prev =>
          prev.map(w => (w.id === workout.id ? { ...w, startedAt, startTime: w.startTime || startedAt } : w))
        );
        return;
      }
    }

    // Check exercise sessions
    if (incompleteExerciseSession && !incompleteExerciseSession.startedAt) {
      const startedAt = incompleteExerciseSession.startTime || Date.now();
      setIncompleteExerciseSession({
        ...incompleteExerciseSession,
        startedAt,
        startTime: incompleteExerciseSession.startTime || startedAt,
      });
      return;
    }

    // Check ad-hoc sessions
    if (adHocSession && !adHocSession.startedAt) {
      const startedAt = Date.now();
      setAdHocSession({
        ...adHocSession,
        startedAt,
        startTime: startedAt, // Set startTime when timer starts (for consistency)
      });
      return;
    }
  };

  const startExerciseSessionInternal = (name: string, previousScreen?: AppScreen) => {
    setExerciseSessionSets([]);
    // Do NOT start timer here - timer starts when first set is logged
    setIncompleteExerciseSession({
      exerciseName: name,
      sets: [],
      // Do not set startTime or startedAt - these will be set when first set is logged
    });
    setScreen({ type: 'exercise-session', exerciseName: name, previousScreen });
    setShowLogExercise(false);
    setExerciseName('');
  };

  /**
   * Repeat a completed workout by creating a NEW, FRESH session.
   * This clones the structure (exercises that were performed) but NOT the history (sets).
   * 
   * Rules:
   * - Never reopens or mutates historical data
   * - Always creates a new active session instance
   * - Populates from what ACTUALLY HAPPENED (exercises with sets), not from template
   * - Preserves order from historical session (including ad-hoc additions/swaps)
   * - New session starts clean (no sets logged yet)
   */
  const startWorkoutFromHistoryInternal = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    // Create a fresh workout session based on what was actually performed
    // Include all exercises that were logged (have sets), preserving order
    // This includes ad-hoc exercises and swaps that occurred mid-session
    const exercisesFromHistory = workout.exercises
      .filter(ex => ex.sets.length > 0) // Only include exercises that were actually performed
      .map((ex, index) => ({
        id: `${Date.now()}-${index}-${Math.random()}`, // Ensure unique ID
        name: ex.name,
        sets: [], // Start with empty sets - fresh session
        isComplete: false, // Explicitly reset completion status (never copy from history)
      }));

    // Edge case: If no exercises were performed, cannot repeat
    if (exercisesFromHistory.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('Cannot repeat workout with no logged exercises');
      }
      return;
    }

    const now = Date.now();
    const newWorkout: Workout = {
      id: `${Date.now()}-${Math.random()}`, // Ensure unique ID
      name: workout.name,
      exercises: exercisesFromHistory,
      startTime: now, // Track when workout was created, but don't start timer yet
      // Do NOT set startedAt - timer starts when first set is logged
      isComplete: false, // Explicitly set as incomplete (never copy from history)
    };

    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  // Wrapped versions that check for conflicts
  const handleStartTemplate = (templateId: string) => {
    checkSessionConflict(
      () => handleStartTemplateInternal(templateId),
      'workout',
      { type: 'template', templateId }
    );
  };

  const handleQuickStart = () => {
    checkSessionConflict(
      () => handleQuickStartInternal(),
      'workout',
      { type: 'quick' }
    );
  };

  const createWorkout = (name: string) => {
    checkSessionConflict(
      () => createWorkoutInternal(name),
      'workout',
      { type: 'named', name }
    );
  };

  const startExerciseSession = (name: string, previousScreen?: AppScreen) => {
    checkSessionConflict(
      () => startExerciseSessionInternal(name, previousScreen),
      'exercise',
      { exerciseName: name }
    );
  };

  const startWorkoutFromHistory = (workoutId: string) => {
    checkSessionConflict(
      () => startWorkoutFromHistoryInternal(workoutId),
      'workout',
      { type: 'history', workoutId }
    );
  };

  const createQuickWorkout = (type: 'upper' | 'lower' | 'core') => {
    const names = {
      upper: 'Upper Body',
      lower: 'Lower Body',
      core: 'Core',
    };
    createWorkout(names[type]);
  };

  const handleLogExerciseFromModal = (name: string) => {
    // Try to add exercise (will return existing if it already exists)
    try {
      addExerciseToDb(name);
    } catch (error) {
      // Exercise might already exist, that's fine - just proceed
      if (import.meta.env.DEV) {
        console.log('[App] Exercise already exists or error adding:', error);
      }
    }
    startExerciseSession(name);
    setBanner({ message: `Selected exercise: ${name}`, variant: 'info' });
  };

  const handleAddNewExerciseFromModal = (name: string) => {
    addExerciseToDb(name);
    startExerciseSession(name);
    setBanner({ message: `Exercise "${name}" added successfully`, variant: 'info' });
  };

  const addExerciseToWorkout = (workoutId: string, exerciseName: string, pairWithExerciseId?: string, swapWithExerciseId?: string, swapGroupId?: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const now = Date.now();
        const newExercise: Exercise = {
          id: `${now}-${Math.random()}`,
          name: exerciseName,
          sets: [],
          groupId: undefined, // Will be set below if pairing or swapping
        };
        
        let updatedExercises = [...w.exercises, newExercise];
        
        // If swap requested, swap the new exercise with the target in the group
        if (swapWithExerciseId && swapGroupId) {
          updatedExercises = swapGroupMember(updatedExercises, swapGroupId, swapWithExerciseId, newExercise.id);
        } else if (pairWithExerciseId) {
          // If pairing requested, group the new exercise with the target
          const targetExercise = w.exercises.find(ex => ex.id === pairWithExerciseId);
          if (targetExercise) {
            const targetGroupId = targetExercise.groupId || `${workoutId}-group-${now}-${Math.random()}`;
            updatedExercises = updatedExercises.map(ex => {
              if (ex.id === newExercise.id) {
                return { ...ex, groupId: targetGroupId };
              }
              if (ex.id === pairWithExerciseId && !ex.groupId) {
                return { ...ex, groupId: targetGroupId };
              }
              return ex;
            });
            // Ensure contiguity
            updatedExercises = addToGroup(updatedExercises, targetGroupId, newExercise.id);
          }
        }
        
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
    addExerciseToDb(exerciseName);
  };

  const addSetToExercise = (workoutId: string, exerciseId: string, weight: number, reps: number, restDuration?: number) => {
    const now = Date.now();
    const workout = workouts.find(w => w.id === workoutId);
    const isFirstSet = workout && workout.exercises.every(ex => ex.sets.length === 0);
    
    // Start timer if this is the first set in the workout
    if (isFirstSet) {
      beginFirstExerciseLog();
    }
    
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const exercise = w.exercises.find(ex => ex.id === exerciseId);
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              // If exercise was complete, reactivate it when a new set is added
              const wasComplete = ex.isComplete;
              return {
                ...ex,
                sets: [...ex.sets, {
                  id: now.toString(),
                  weight,
                  reps,
                  timestamp: now,
                  restDuration,
                }],
                // Reactivate exercise if it was previously complete
                isComplete: wasComplete ? false : ex.isComplete,
                // Persist timestamp of last set for rest timer
                lastSetAt: now,
              };
            }
            return ex;
          }),
          // Update session-level lastSetAt and lastSetOwnerId
          lastSetAt: now,
          lastSetOwnerId: exercise?.groupId || exerciseId,
        };
      }
      return w;
    }));
  };

  const deleteSetFromExercise = (workoutId: string, exerciseId: string, setId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedWorkout = {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              const updatedSets = ex.sets.filter(s => s.id !== setId);
              // Update lastSetAt: use most recent set timestamp if sets remain, otherwise clear
              const newLastSetAt = updatedSets.length > 0
                ? Math.max(...updatedSets.map(s => s.timestamp))
                : undefined;
              return {
                ...ex,
                sets: updatedSets,
                lastSetAt: newLastSetAt,
              };
            }
            return ex;
          }),
        };
        // Recalculate session-level lastSetAt from all exercises
        const allSets = updatedWorkout.exercises.flatMap(ex => ex.sets);
        const sessionLastSetAt = allSets.length > 0
          ? Math.max(...allSets.map(s => s.timestamp))
          : null;
        // Find the owner of the most recent set
        let sessionLastSetOwnerId: string | null = null;
        if (sessionLastSetAt) {
          for (const ex of updatedWorkout.exercises) {
            const hasMostRecent = ex.sets.some(s => s.timestamp === sessionLastSetAt);
            if (hasMostRecent) {
              sessionLastSetOwnerId = ex.groupId || ex.id;
              break;
            }
          }
        }
        return {
          ...updatedWorkout,
          lastSetAt: sessionLastSetAt,
          lastSetOwnerId: sessionLastSetOwnerId,
        };
      }
      return w;
    }));
  };

  const updateSetFromExercise = (workoutId: string, exerciseId: string, setId: string, weight: number, reps: number) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.map(s => {
                  if (s.id === setId) {
                    return {
                      ...s,
                      weight,
                      reps,
                    };
                  }
                  return s;
                }),
              };
            }
            return ex;
          }),
        };
      }
      return w;
    }));
  };

  const addSupersetSetToWorkout = (workoutId: string, exercises: Array<{ exerciseId: string; weight: number; reps: number }>, supersetSetId: string) => {
    const now = Date.now();
    const workout = workouts.find(w => w.id === workoutId);
    const isFirstSet = workout && workout.exercises.every(ex => ex.sets.length === 0);
    
    // Start timer if this is the first set in the workout
    if (isFirstSet) {
      beginFirstExerciseLog();
    }
    
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        // Find the groupId from the first exercise in the superset
        const firstExercise = w.exercises.find(ex => exercises.some(e => e.exerciseId === ex.id));
        const groupId = firstExercise?.groupId || null;
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            const exerciseData = exercises.find(e => e.exerciseId === ex.id);
            if (exerciseData) {
              // If exercise was complete, reactivate it when a new set is added
              const wasComplete = ex.isComplete;
              return {
                ...ex,
                sets: [...ex.sets, {
                  id: now.toString() + '-' + ex.id,
                  weight: exerciseData.weight,
                  reps: exerciseData.reps,
                  timestamp: now,
                  supersetSetId,
                }],
                // Reactivate exercise if it was previously complete
                isComplete: wasComplete ? false : ex.isComplete,
                // Persist timestamp of last set for rest timer (all exercises in superset get same timestamp)
                lastSetAt: now,
              };
            }
            return ex;
          }),
          // Update session-level lastSetAt and lastSetOwnerId (use groupId for supersets)
          lastSetAt: now,
          lastSetOwnerId: groupId,
        };
      }
      return w;
    }));
  };

  const completeGroupInWorkout = (workoutId: string, exerciseIds: string[]) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (exerciseIds.includes(ex.id)) {
              return { ...ex, isComplete: true };
            }
            return ex;
          }),
        };
      }
      return w;
    }));
  };

  const completeExercise = (workoutId: string, exerciseId: string) => {
    // Mark exercise as complete
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return { ...ex, isComplete: true };
            }
            return ex;
          }),
        };
      }
      return w;
    }));
  };

  const skipExercise = (workoutId: string, exerciseId: string) => {
    // Remove exercise from workout (preserves trace as skipped)
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => ex.id !== exerciseId),
        };
      }
      return w;
    }));
  };

  const skipExerciseInGroup = (workoutId: string, exerciseId: string) => {
    // Mark exercise as skipped (stays visible, excluded from group set propagation)
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, isSkipped: true } : ex
          ),
        };
      }
      return w;
    }));
  };

  const unskipExerciseInGroup = (workoutId: string, exerciseId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, isSkipped: false } : ex
          ),
        };
      }
      return w;
    }));
  };

  const deleteExercise = (workoutId: string, exerciseId: string) => {
    // Remove exercise from workout completely (no trace)
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => ex.id !== exerciseId),
        };
      }
      return w;
    }));
  };

  const skipGroup = (workoutId: string, exerciseIds: string[]) => {
    // Remove all exercises in group from workout (preserves trace as skipped)
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => !exerciseIds.includes(ex.id)),
        };
      }
      return w;
    }));
  };

  const deferGroup = (workoutId: string, exerciseIds: string[]) => {
    // Move all exercises in group to the bottom of the list
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const groupExercises = w.exercises.filter(ex => exerciseIds.includes(ex.id));
        const otherExercises = w.exercises.filter(ex => !exerciseIds.includes(ex.id));
        return {
          ...w,
          exercises: [...otherExercises, ...groupExercises],
        };
      }
      return w;
    }));
  };

  const deleteGroup = (workoutId: string, exerciseIds: string[]) => {
    // Remove all exercises in group from workout completely (no trace)
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => !exerciseIds.includes(ex.id)),
        };
      }
      return w;
    }));
  };

  const deferExercise = (workoutId: string, exerciseId: string) => {
    // Move exercise to the bottom of the list
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const exerciseIndex = w.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex === -1) return w;
        
        const exercise = w.exercises[exerciseIndex];
        const newExercises = [...w.exercises];
        newExercises.splice(exerciseIndex, 1);
        newExercises.push(exercise); // Move to end
        
        return { ...w, exercises: newExercises };
      }
      return w;
    }));
  };

  const reorderExercises = (workoutId: string, newExercises: Exercise[]) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return { ...w, exercises: newExercises };
      }
      return w;
    }));
  };
  
  const groupExercisesInWorkout = (workoutId: string, instanceIds: string[]) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = createGroup(w.exercises, instanceIds);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };
  
  const addToGroupInWorkout = (workoutId: string, groupId: string, instanceId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = addToGroup(w.exercises, groupId, instanceId);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };
  
  const mergeGroupsInWorkout = (workoutId: string, groupId1: string, groupId2: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = mergeGroups(w.exercises, groupId1, groupId2);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };
  
  const ungroupExerciseInWorkout = (workoutId: string, instanceId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = ungroup(w.exercises, instanceId);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };

  const ungroupGroupInWorkout = (workoutId: string, groupId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = ungroupAll(w.exercises, groupId);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };

  const swapGroupMemberInWorkout = (workoutId: string, groupId: string, sourceMemberInstanceId: string, replacementInstanceId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const updatedExercises = swapGroupMember(w.exercises, groupId, sourceMemberInstanceId, replacementInstanceId);
        return { ...w, exercises: updatedExercises };
      }
      return w;
    }));
  };

  const swapExercise = (workoutId: string, exerciseId: string, newExerciseName: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    const exerciseToReplace = workout.exercises.find(ex => ex.id === exerciseId);
    if (!exerciseToReplace) return;

    // Find the original exercise in DB to get its ID for swap history
    const allExercises = getAllExercisesList();
    const originalDbExercise = allExercises.find(ex => ex.name === exerciseToReplace.name);
    const replacementDbExercise = allExercises.find(ex => ex.name === newExerciseName);

    // Record swap history
    if (originalDbExercise && replacementDbExercise) {
      recordSwap(
        originalDbExercise.id,
        replacementDbExercise.id,
        workoutId,
        exerciseId // Use exerciseId as slotId
      );
    }

    // Swap semantics:
    // - No logged sets: replace in place (true swap)
    // - Has logged sets: keep old exercise with sets in history, insert new exercise after
    setWorkouts(workouts.map(w => {
      if (w.id !== workoutId) return w;
      return {
        ...w,
        exercises: w.exercises.flatMap(ex => {
          if (ex.id !== exerciseId) return [ex];
          // No logged sets: true swap-in-place
          if (ex.sets.length === 0) {
            return [{
              ...ex,
              name: newExerciseName,
              sets: [],
              isComplete: false,
            }];
          }
          // Has logged sets: keep old exercise with sets, insert new after
          const newEx = {
            id: Date.now().toString() + Math.random(),
            name: newExerciseName,
            sets: [] as typeof ex.sets,
            isComplete: false,
          };
          return [ex, newEx];
        }),
      };
    }));
  };

  const updateWorkoutName = (workoutId: string, newName: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          name: newName,
          isUserNamed: true, // Mark as user-edited to prevent auto-naming override
        };
      }
      return w;
    }));
  };

  const finishWorkout = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    // Auto-discard if nothing logged
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    if (totalSets === 0) {
      setWorkouts(workouts.filter(w => w.id !== workoutId));
      setBanner({ message: 'Workout discarded', variant: 'info' });
      setScreen({ type: 'home' });
      return;
    }

    // Check if all exercises have sets
    const hasIncompleteExercises = workout.exercises.some(ex => ex.sets.length === 0);
    
    if (hasIncompleteExercises) {
      // Show confirmation modal for partial progress
      setFinishWorkoutId(workoutId);
      setShowFinishConfirm(true);
      return;
    }

    // All exercises complete - proceed to summary
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        // Idempotent finalize timing
        if (w.endedAt) {
          return { ...w, isComplete: true, endTime: w.endTime || w.endedAt, startedAt: w.startedAt || w.startTime || w.endedAt };
        }
        const endedAt = Date.now();
        const startedAt = w.startedAt || w.startTime || endedAt;
        return {
          ...w,
          isComplete: true,
          endTime: endedAt,
          startedAt,
          endedAt,
          durationSec: w.durationSec ?? computeDurationSec(startedAt, endedAt),
          templateId: w.templateId, // Preserve templateId
        };
      }
      return w;
    }));
    setScreen({ type: 'workout-summary', workoutId, isJustCompleted: true, previousScreen: screen });
  };

  const savePartialWorkout = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    // Remove exercises with no sets
    const completedExercises = workout.exercises.filter(ex => ex.sets.length > 0);
    
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        if (w.endedAt) {
        return { 
          ...w, 
          exercises: completedExercises,
          isComplete: true, 
            endTime: w.endTime || w.endedAt,
            startedAt: w.startedAt || w.startTime || w.endedAt,
            endedAt: w.endedAt,
            durationSec: w.durationSec,
            templateId: w.templateId, // Preserve templateId
          };
        }
        const endedAt = Date.now();
        const startedAt = w.startedAt || w.startTime || endedAt;
        return { 
          ...w, 
          exercises: completedExercises,
          isComplete: true, 
          endTime: endedAt,
          startedAt,
          endedAt,
          durationSec: w.durationSec ?? computeDurationSec(startedAt, endedAt),
          templateId: w.templateId, // Preserve templateId
        };
      }
      return w;
    }));
    setScreen({ type: 'workout-summary', workoutId });
  };

  const discardWorkout = (workoutId: string) => {
    setWorkouts(workouts.filter(w => w.id !== workoutId));
    saveIncompleteWorkoutId(null); // Clear incomplete workout ID
    setBanner({ message: 'Workout discarded', variant: 'info' });
    setScreen({ type: 'home' });
  };

  const handleDiscardWorkout = () => {
    if (unfinishedWorkout) {
      discardWorkout(unfinishedWorkout.id);
    }
  };

  const handleDiscardExercise = () => {
    setIncompleteExerciseSession(null);
    setBanner({ message: 'Exercise session discarded', variant: 'info' });
  };

  const finishExerciseSession = (exerciseName: string, sets: any[]) => {
    if (sets.length === 0) {
      setBanner({ message: 'Add at least one set', variant: 'warning' });
      return;
    }

    // Create a workout with this single exercise
    const now = Date.now();
    const startedAt = incompleteExerciseSession?.startedAt || incompleteExerciseSession?.startTime || now;
    const endedAt = now;
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: exerciseName,
      exercises: [{
        id: Date.now().toString(),
        name: exerciseName,
        sets,
      }],
      startTime: startedAt,
      endTime: endedAt,
      startedAt,
      endedAt,
      durationSec: computeDurationSec(startedAt, endedAt),
      isComplete: true,
    };
    setWorkouts([...workouts, newWorkout]);
    setScreen({ type: 'workout-summary', workoutId: newWorkout.id });
  };

  // Generate next workout number
  const generateWorkoutNumber = (): string => {
    // Find all workouts with names like "Workout #001", "Workout #002", etc.
    const workoutNumbers = workouts
      .map(w => {
        const match = w.name.match(/^Workout #(\d{3})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    const nextNumber = workoutNumbers.length > 0 ? Math.max(...workoutNumbers) + 1 : 1;
    return `Workout #${String(nextNumber).padStart(3, '0')}`;
  };

  // Show exercise complete confirmation - go directly to summary for single exercises
  const handleExerciseComplete = () => {
    if (exerciseSessionSets.length === 0) {
      setBanner({ message: 'Add at least one set', variant: 'warning' });
      return;
    }
    // Go directly to summary, skipping the modal
    confirmFinishExercise();
  };

  // Finish single exercise and log it
  const confirmFinishExercise = () => {
    if (screen.type !== 'exercise-session') return;
    
    const now = Date.now();
    const startedAt = incompleteExerciseSession?.startedAt || incompleteExerciseSession?.startTime || now;
    const endedAt = now;
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: screen.exerciseName,
      exercises: [{
        id: Date.now().toString(),
        name: screen.exerciseName,
        sets: exerciseSessionSets,
        isComplete: true,
      }],
      startTime: startedAt,
      endTime: endedAt,
      startedAt,
      endedAt,
      durationSec: computeDurationSec(startedAt, endedAt),
      isComplete: true,
    };
    setWorkouts([...workouts, newWorkout]);
    setShowExerciseComplete(false);
    setExerciseSessionSets([]);
    setIncompleteExerciseSession(null);
    // Mark as single exercise session so we don't double-save
    // Preserve previousScreen if we came from start-logging
    setScreen({ 
      type: 'workout-summary', 
      workoutId: newWorkout.id, 
      isJustCompleted: true, 
      isSingleExercise: true,
      previousScreen: screen.previousScreen 
    });
  };

  // Convert exercise session to workout
  const convertExerciseToWorkout = () => {
    if (screen.type !== 'exercise-session') return;
    
    const workoutName = generateWorkoutNumber();
    const startedAt = incompleteExerciseSession?.startedAt || incompleteExerciseSession?.startTime || Date.now();
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workoutName,
      exercises: [{
        id: Date.now().toString(),
        name: screen.exerciseName,
        sets: exerciseSessionSets,
        isComplete: true,
      }],
      startTime: startedAt,
      startedAt,
      isComplete: false,
    };
    setWorkouts([...workouts, newWorkout]);
    setShowExerciseComplete(false);
    setExerciseSessionSets([]);
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  // Log another exercise after completing one
  const logAnotherExercise = () => {
    setShowExerciseComplete(false);
    setExerciseSessionSets([]);
    setIncompleteExerciseSession(null);
    setExerciseSearchOverlay({
      title: 'Log Exercise',
      onSelect: (name) => {
        handleLogExerciseFromModal(name);
        setExerciseSearchOverlay(null);
      },
      onBack: () => setExerciseSearchOverlay(null),
      onAddNewExercise: (name) => {
        handleAddNewExerciseFromModal(name);
        setExerciseSearchOverlay(null);
      },
      createButtonLabel: 'Create & start',
    });
  };

  // Handle exercise session back - save as incomplete if sets exist
  const handleExerciseSessionBack = () => {
    if (exerciseSessionSets.length > 0 && screen.type === 'exercise-session') {
      // Save as incomplete with lastSetAt timestamp
      const startedAt = incompleteExerciseSession?.startedAt || incompleteExerciseSession?.startTime || Date.now();
      // Compute lastSetAt from the most recent set
      const lastSetAt = exerciseSessionSets.length > 0
        ? Math.max(...exerciseSessionSets.map(s => s.timestamp))
        : undefined;
      
      setIncompleteExerciseSession({
        exerciseName: screen.exerciseName,
        sets: exerciseSessionSets,
        startTime: startedAt,
        startedAt,
        lastSetAt,
        lastSetOwnerId: lastSetAt ? screen.exerciseName : null,
      });
    } else {
      // Clear incomplete if no sets
      setIncompleteExerciseSession(null);
    }
    setExerciseSessionSets([]);
    
    // Return to previous screen if available (e.g., start-logging), otherwise home
    if (screen.type === 'exercise-session' && screen.previousScreen) {
      setScreen(screen.previousScreen);
    } else {
    setScreen({ type: 'home' });
    }
  };

  // Resume incomplete exercise session
  const resumeExerciseSession = () => {
    if (!incompleteExerciseSession) return;
    setExerciseSessionSets(incompleteExerciseSession.sets);
    setScreen({ type: 'exercise-session', exerciseName: incompleteExerciseSession.exerciseName });
  };

  const deleteWorkouts = (workoutIds: string[]) => {
    setWorkouts(workouts.filter(w => !workoutIds.includes(w.id)));
    setBanner({ 
      message: workoutIds.length === 1 ? 'Entry deleted' : `Deleted ${workoutIds.length} items`, 
      variant: 'info' 
    });
  };


  // Memoized callback for HistoryScreen state changes to prevent infinite loops
  const handleHistoryStateChange = useCallback((searchQuery: string, scrollPosition: number) => {
    setScreen({ type: 'history', searchQuery, scrollPosition });
  }, []);

  // Show recovery screen if storage load failed
  if (storageError) {
    return (
      <DataRecoveryScreen
        error={storageError.error}
        rawData={storageError.rawData}
        onRecoveryComplete={() => {
          // Reload state after recovery
          const result = loadState();
          if (result.success && result.state) {
            setWorkouts(result.state.workouts || []);
            setTemplates(result.state.templates || []);
            setIncompleteExerciseSession(result.state.incompleteExerciseSession ?? null);
            setAdHocSession(result.state.adHocSession ?? null);
            setStorageError(null);
          }
        }}
        onReset={() => {
          // Reset to empty state
          setWorkouts([]);
          setTemplates([]);
          setIncompleteExerciseSession(null);
          setAdHocSession(null);
          setStorageError(null);
          setScreen({ type: 'home' });
        }}
      />
    );
  }

  return (
    <div className="size-full flex flex-col bg-background">
      <Toaster position="bottom" richColors />
      {/* Main content area with bottom padding for fixed nav (only when nav visible and screen needs it).
          Start-logging uses BottomStickyCTA for CTA spacing, so no pb-24 here. */}
      <div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${
        !(
          screen.type === 'create-template' ||
          screen.type === 'view-template' ||
          screen.type === 'workout-session' ||
          screen.type === 'workout-summary' ||
          screen.type === 'exercise-session' ||
          screen.type === 'start-logging'
        ) ? 'pb-24' : ''
      }`}>

        {screen.type === 'home' && (
          !stateHydrated ? (
            <div className="flex-1 overflow-y-auto" data-testid="home-loading-skeleton">
              <div className="max-w-2xl mx-auto p-5 space-y-6">
                <div className="pt-4 pb-2 flex items-start justify-between animate-pulse">
                  <div className="h-14 w-14 rounded-2xl bg-surface" />
                  <div className="flex-1 ml-4 space-y-2">
                    <div className="h-8 w-48 bg-surface rounded" />
                    <div className="h-4 w-32 bg-surface rounded" />
                  </div>
                </div>
                <div className="h-24 bg-surface rounded-xl animate-pulse" />
                <div className="h-24 bg-surface rounded-xl animate-pulse" />
                <div className="h-24 bg-surface rounded-xl animate-pulse" />
              </div>
            </div>
          ) : (
          <HomeScreen
            unfinishedWorkout={unfinishedWorkout}
            incompleteExerciseSession={incompleteExerciseSession}
            adHocSession={adHocSession}
            workoutTemplates={templates}
            theme={theme}
            onThemeChange={(newTheme) => {
              setTheme(newTheme);
              setAppearance(newTheme);
            }}
            onUnitChange={handleUnitChange}
            onOpenSettings={() => setScreen({ type: 'settings', previousScreen: { type: 'home' } })}
            onCreateTemplate={() => setScreen({ type: 'create-template' })}
            onViewTemplate={(templateId) => setScreen({ type: 'view-template', templateId })}
            onStartTemplate={handleStartTemplate}
            onQuickStart={handleQuickStart}
            onLogExercise={() => setScreen({ type: 'start-logging' })}
            onResumeAdHocSession={() => {
              if (adHocSession) {
                setScreen({ type: 'ad-hoc-session', sessionId: adHocSession.id });
              }
            }}
            onDiscardAdHocSession={() => {
              setAdHocSession(null);
            }}
            onResumeWorkout={() => {
              if (unfinishedWorkout) {
                // Double-check the workout exists in the workouts array before navigating
                const workoutExists = workouts.find(w => w.id === unfinishedWorkout.id);
                if (workoutExists) {
                  setScreen({ type: 'workout-session', workoutId: unfinishedWorkout.id });
                } else {
                  console.error('Cannot resume workout - not found in workouts array:', unfinishedWorkout.id);
                  setBanner({ message: 'Workout not found', variant: 'error' });
                }
              }
            }}
            onResumeExercise={resumeExerciseSession}
            onDiscardWorkout={handleDiscardWorkout}
            onDiscardExercise={handleDiscardExercise}
            onDeleteTemplate={(templateId) => {
              const previousTemplates = templates;
              setTemplates(previousTemplates.filter(t => t.id !== templateId));
              const success = deleteTemplate(templateId);
              if (!success) {
                setTemplates(previousTemplates);
                toast.error('Unable to delete workout.');
              }
            }}
            onReload={import.meta.env.DEV ? () => {
              const result = loadState();
              if (result.success && result.state) {
                setWorkouts(result.state.workouts || []);
                setTemplates(result.state.templates || []);
                setIncompleteExerciseSession(result.state.incompleteExerciseSession ?? null);
                setAdHocSession(result.state.adHocSession ?? null);
                setStateHydrated(true);
              }
            } : undefined}
          />
        )
        )}

        {screen.type === 'create-template' && (
          <CreateWorkoutScreen
            onSave={handleSaveTemplate}
            onDiscard={() => setScreen({ type: 'home' })}
          />
        )}

        {screen.type === 'view-template' && (() => {
          // Defensive: Ensure templateId exists
          if (!screen.templateId) {
            if (import.meta.env.DEV) {
              console.error('[App] view-template screen missing templateId');
            }
            return (
              <div className="flex flex-col h-full items-center justify-center p-5">
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-xl font-semibold">Workout not found</h2>
                  <p className="text-text-muted">
                    The workout you're looking for could not be found. It may have been deleted.
                  </p>
                  <Button variant="primary" onClick={() => setScreen({ type: 'home' })}>
                    Back to Home
                  </Button>
                </div>
              </div>
            );
          }

          // Find template by ID - this is the explicit data source (not from active session state)
          const template = templates.find(t => t.id === screen.templateId);
          
          // Defensive: Handle missing template with error state
          if (!template) {
            if (import.meta.env.DEV) {
              console.error('[App] Template not found for templateId:', screen.templateId, 'Available templates:', templates.map(t => t.id));
            }
            return (
              <div className="flex flex-col h-full items-center justify-center p-5">
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-xl font-semibold">Workout not found</h2>
                  <p className="text-text-muted">
                    The workout template could not be found. It may have been deleted or the ID is invalid.
                  </p>
                  <Button variant="primary" onClick={() => setScreen({ type: 'home' })}>
                    Back to Home
                  </Button>
                </div>
              </div>
            );
          }

          // Defensive: Ensure template has required properties
          if (!template.exerciseNames || !Array.isArray(template.exerciseNames)) {
            if (import.meta.env.DEV) {
              console.error('[App] Template has invalid exerciseNames:', template);
            }
            return (
              <div className="flex flex-col h-full items-center justify-center p-5">
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-xl font-semibold">Invalid workout data</h2>
                  <p className="text-text-muted">
                    The workout data is invalid or corrupted.
                  </p>
                  <Button variant="primary" onClick={() => setScreen({ type: 'home' })}>
                    Back to Home
                  </Button>
                </div>
              </div>
            );
          }
          
          // Build last session data map for template exercises
          const lastSessionData = new Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>();
          template.exerciseNames.forEach(exerciseName => {
            const lastSession = getLastSessionForExercise(exerciseName, workouts);
            if (lastSession) {
              lastSessionData.set(exerciseName, lastSession);
            }
          });
          
          // Get completed workouts for duration estimation
          const completedWorkouts = workouts.filter(w => w.isComplete && w.durationSec !== undefined);
          
          return (
            <ViewTemplateScreen
              template={template}
              lastSessionData={lastSessionData}
              completedWorkouts={completedWorkouts}
              onBack={() => setScreen({ type: 'home' })}
              onStart={(editedExerciseNames) => {
                // Create workout with edited exercises (editedExerciseNames is always provided)
                checkSessionConflict(
                  () => {
                    const workoutId = `${Date.now()}-${Math.random()}`;
                    const startedAt = Date.now();
                    const newWorkout: Workout = {
                      id: workoutId,
                      name: template.name,
                      exercises: editedExerciseNames.map((name, idx) => ({
                        id: `${workoutId}-ex-${idx}-${Math.random()}`,
                        name,
                        sets: [],
                        isComplete: false,
                      })),
                      startTime: startedAt,
                      startedAt,
                      isComplete: false,
                      templateId: template.id, // Store template reference for duration estimation
                    };
                    setWorkouts(prev => [...prev, newWorkout]);
                    saveIncompleteWorkoutId(newWorkout.id);
                    // Navigate directly to active workout session (not completion screen)
                    // Clear any exercise-session screen state first to prevent navigation to completion screen
                    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
                  },
                  'workout',
                  { type: 'template', templateId: template.id }
                );
              }}
              onEdit={() => {
                // Edit mode is handled internally by ViewTemplateScreen
              }}
              onSave={(name, exercises) => {
                // Update template with edited name and exercises
                const updatedTemplate: WorkoutTemplate = {
                  ...template,
                  name: name.trim(),
                  exerciseNames: exercises,
                  updatedAt: Date.now(),
                };
                saveTemplate(updatedTemplate);
                setTemplates(templates.map(t => t.id === template.id ? updatedTemplate : t));
                setBanner({ message: `Updated "${name}"`, variant: 'info' });
              }}
              onDelete={() => {
                deleteTemplate(template.id);
                setTemplates(templates.filter(t => t.id !== template.id));
                setBanner({ message: `Deleted "${template.name}"`, variant: 'info' });
                setScreen({ type: 'home' });
              }}
            />
          );
        })()}

        {screen.type === 'workout-session' && (() => {
          const workout = workouts.find(w => w.id === screen.workoutId);
          if (!workout) {
            if (import.meta.env.DEV) {
              console.error('[App] Workout not found:', {
                lookingFor: screen.workoutId,
                availableWorkouts: workouts.map(w => ({ id: w.id, name: w.name, isComplete: w.isComplete })),
                workoutsLength: workouts.length
              });
            }
            // If workout not found, show error and provide way to go back
            return (
              <div className="flex items-center justify-center h-full p-5">
                <div className="text-center max-w-md">
                  <p className="text-text-primary text-lg mb-2">Workout not found</p>
                  <p className="text-text-muted mb-6">The workout may have been deleted or is no longer available.</p>
                  <Button variant="primary" onClick={() => {
                    setScreen({ type: 'home' });
                    setBanner({ message: 'Returned to home', variant: 'info' });
                  }}>
                    Go Home
                  </Button>
                </div>
              </div>
            );
          }

          // Defensive: Ensure workout has exercises and they're not all complete
          if (!workout.exercises || workout.exercises.length === 0) {
            if (import.meta.env.DEV) {
              console.error('[App] Workout has no exercises:', workout);
            }
            return (
              <div className="flex items-center justify-center h-full p-5">
                <div className="text-center max-w-md">
                  <p className="text-text-primary text-lg mb-2">Invalid workout</p>
                  <p className="text-text-muted mb-6">This workout has no exercises.</p>
                  <Button variant="primary" onClick={() => {
                    setScreen({ type: 'home' });
                    setBanner({ message: 'Returned to home', variant: 'info' });
                  }}>
                    Go Home
                  </Button>
                </div>
              </div>
            );
          }

          // Defensive: Log if all exercises are complete (shouldn't happen for new workouts)
          const allComplete = workout.exercises.every(ex => ex.isComplete);
          if (allComplete && !workout.isComplete) {
            if (import.meta.env.DEV) {
              console.warn('[App] New workout has all exercises marked complete:', {
                workoutId: workout.id,
                workoutName: workout.name,
                exercises: workout.exercises.map(ex => ({ name: ex.name, isComplete: ex.isComplete, sets: ex.sets.length }))
              });
            }
          }
          
          // Build last session data map
          const lastSessionData = new Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>();
          workout.exercises.forEach(exercise => {
            const lastSession = getLastSessionForExercise(exercise.name, workouts);
            if (lastSession) {
              lastSessionData.set(exercise.name, lastSession);
            }
          });
          
          return (
            <WorkoutSessionScreen
              workoutName={workout.name}
              exercises={workout.exercises}
              lastSessionData={lastSessionData}
              allWorkouts={workouts}
              startedAt={workout.startedAt || workout.startTime}
              endedAt={workout.endedAt || workout.endTime}
              onEnsureStartedAt={() => {
                // Do NOT start timer here - timer starts when first set is logged
                // This callback is kept for compatibility but does nothing
              }}
              onBack={() => setScreen({ type: 'home' })}
              onAddExercise={(name, pairWithExerciseId, swapWithExerciseId, swapGroupId) => {
                addExerciseToWorkout(workout.id, name, pairWithExerciseId, swapWithExerciseId, swapGroupId);
              }}
              onAddSet={(exerciseId, weight, reps) => addSetToExercise(workout.id, exerciseId, weight, reps)}
              onAddSupersetSet={(exercises, supersetSetId) => addSupersetSetToWorkout(workout.id, exercises, supersetSetId)}
              onDeleteSet={(exerciseId, setId) => deleteSetFromExercise(workout.id, exerciseId, setId)}
              onUpdateSet={(exerciseId, setId, weight, reps) => updateSetFromExercise(workout.id, exerciseId, setId, weight, reps)}
              onCompleteExercise={(exerciseId) => completeExercise(workout.id, exerciseId)}
              onCompleteGroup={(exerciseIds) => completeGroupInWorkout(workout.id, exerciseIds)}
              onSkipExercise={(exerciseId) => skipExercise(workout.id, exerciseId)}
              onSkipExerciseInGroup={(exerciseId) => skipExerciseInGroup(workout.id, exerciseId)}
              onUnskipExerciseInGroup={(exerciseId) => unskipExerciseInGroup(workout.id, exerciseId)}
              onDeferExercise={(exerciseId) => deferExercise(workout.id, exerciseId)}
              onDeleteExercise={(exerciseId) => deleteExercise(workout.id, exerciseId)}
              onSwapExercise={(exerciseId, newExerciseName) => swapExercise(workout.id, exerciseId, newExerciseName)}
              onSkipGroup={(exerciseIds) => skipGroup(workout.id, exerciseIds)}
              onDeferGroup={(exerciseIds) => deferGroup(workout.id, exerciseIds)}
              onDeleteGroup={(exerciseIds) => deleteGroup(workout.id, exerciseIds)}
              onReorderExercises={(newExercises) => reorderExercises(workout.id, newExercises)}
              onFinishWorkout={() => finishWorkout(workout.id)}
              onGroupExercises={(instanceIds) => groupExercisesInWorkout(workout.id, instanceIds)}
              onAddToGroup={(groupId, instanceId) => addToGroupInWorkout(workout.id, groupId, instanceId)}
              onMergeGroups={(groupId1, groupId2) => mergeGroupsInWorkout(workout.id, groupId1, groupId2)}
              onUngroup={(instanceId) => ungroupExerciseInWorkout(workout.id, instanceId)}
              onUngroupGroup={(groupId) => ungroupGroupInWorkout(workout.id, groupId)}
              onSwapGroupMember={(groupId, sourceMemberInstanceId, replacementInstanceId) => swapGroupMemberInWorkout(workout.id, groupId, sourceMemberInstanceId, replacementInstanceId)}
            />
          );
        })()}

        {screen.type === 'exercise-session' && (() => {
          const lastSession = getLastSessionForExercise(screen.exerciseName, workouts);
          
          return (
            <ExerciseSessionScreen
              exerciseName={screen.exerciseName}
              sets={exerciseSessionSets}
              lastSession={lastSession}
              allWorkouts={workouts}
              startedAt={incompleteExerciseSession?.startedAt || incompleteExerciseSession?.startTime}
              endedAt={incompleteExerciseSession?.endedAt || incompleteExerciseSession?.endTime}
              onEnsureStartedAt={() => {
                // Do NOT start timer here - timer starts when first set is logged
                // This callback is kept for compatibility but does nothing
              }}
              lastSetAt={incompleteExerciseSession?.lastSetAt}
              onBack={handleExerciseSessionBack}
              onAddSet={(weight, reps, restDuration) => {
                const now = Date.now();
                const isFirstSet = exerciseSessionSets.length === 0;
                
                // Start timer if this is the first set
                if (isFirstSet) {
                  beginFirstExerciseLog();
                }
                
                setExerciseSessionSets([...exerciseSessionSets, {
                  id: now.toString(),
                  weight,
                  reps,
                  timestamp: now,
                  restDuration,
                }]);
                // Update lastSetAt and lastSetOwnerId in incomplete session
                if (incompleteExerciseSession) {
                  setIncompleteExerciseSession({
                    ...incompleteExerciseSession,
                    lastSetAt: now,
                    lastSetOwnerId: incompleteExerciseSession.exerciseName, // For single-exercise sessions, use exercise name as owner
                  });
                }
              }}
              onDeleteSet={(setId) => {
                const updatedSets = exerciseSessionSets.filter(s => s.id !== setId);
                setExerciseSessionSets(updatedSets);
                // Update lastSetAt if sets remain, otherwise clear it
                if (incompleteExerciseSession) {
                  const newLastSetAt = updatedSets.length > 0
                    ? Math.max(...updatedSets.map(s => s.timestamp))
                    : undefined;
                  setIncompleteExerciseSession({
                    ...incompleteExerciseSession,
                    sets: updatedSets,
                    lastSetAt: newLastSetAt,
                    lastSetOwnerId: newLastSetAt ? incompleteExerciseSession.exerciseName : null,
                  });
                }
              }}
              onFinish={() => handleExerciseComplete()}
            />
          );
        })()}

        {screen.type === 'workout-summary' && (() => {
          const workout = workouts.find(w => w.id === screen.workoutId);
          if (!workout) {
            return (
              <div className="flex flex-col h-full items-center justify-center p-5">
                <div className="text-center space-y-4 max-w-md">
                  <p className="text-text-primary text-lg mb-2">Workout not found</p>
                  <p className="text-text-muted mb-6">The workout may have been deleted or is no longer available.</p>
                  <Button variant="primary" onClick={() => setScreen({ type: 'home' })}>
                    Go Home
                  </Button>
                </div>
              </div>
            );
          }
          const isFromHistory = screen.previousScreen?.type === 'history';
          const isJustCompletedMulti =
            !!screen.isJustCompleted && !screen.isSingleExercise && workout.exercises.length >= 2;
          return (
            <WorkoutSummaryScreen
              workout={workout}
              isJustCompleted={screen.isJustCompleted}
              isSingleExercise={screen.isSingleExercise}
              isFromHistory={isFromHistory}
              onUpdateName={updateWorkoutName}
              onSaveWorkout={(workoutId, name) => {
                const workoutToSave = workouts.find(w => w.id === workoutId);
                if (!workoutToSave) return;
                
                // Convert workout to template
                const newTemplate: WorkoutTemplate = {
                  id: Date.now().toString(),
                  name: name,
                  exerciseNames: workoutToSave.exercises.map(ex => ex.name),
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                
                setTemplates([...templates, newTemplate]);
                saveTemplate(newTemplate);
                setBanner({ message: 'Workout saved', variant: 'info' });
              }}
              onDelete={
                isFromHistory || isJustCompletedMulti
                  ? () => {
                      deleteWorkouts([workout.id]);
                      setBanner({ message: 'Workout deleted', variant: 'info' });

                      // After deleting a just-finished workout, always go Home.
                      // After deleting from history, return to history list (existing behavior below uses previousScreen).
                      if (isFromHistory && screen.previousScreen?.type === 'history') {
                        setScreen({ ...screen.previousScreen, restoreKey: Date.now() });
                      } else {
                        setScreen({ type: 'home' });
                      }
                    }
                  : undefined
              }
              onFinalize={async () => {
                // Finalize the workout: check if it should be saved or discarded
                const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                
                if (totalSets === 0 || workout.exercises.length === 0) {
                  // Discard workout with no sets or exercises
                  deleteWorkouts([workout.id]);
                  setBanner({ message: 'Workout discarded', variant: 'info' });
                } else {
                  // Workout already saved to workouts array, just try backend save
                  try {
                    if (import.meta.env.DEV) {
                      console.log('Saving workout:', workout);
                    }
                    await saveWorkout(workout);
                    setBanner({ message: 'Workout saved', variant: 'info' });
                  } catch (error) {
                    // Silently fail - workout is already saved locally
                    if (import.meta.env.DEV) {
                      console.warn('Backend save failed (workout saved locally):', error);
                    }
                    setBanner({ message: 'Workout saved', variant: 'info' });
                  }
                }
                
                // Clear any active sessions
                setAdHocSession(null);
                
                // Navigate to Home
                setScreen({ type: 'home' });
              }}
              onBack={async () => {
                // If just completed, use finalize instead
                if (screen.isJustCompleted) {
                  // This should not be called when Done is tapped (onFinalize handles that)
                  // But if back button is used, still finalize
                  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                  
                  if (totalSets === 0 || workout.exercises.length === 0) {
                    deleteWorkouts([workout.id]);
                    setBanner({ message: 'Workout discarded', variant: 'info' });
                  } else {
                    try {
                      await saveWorkout(workout);
                      setBanner({ message: 'Workout saved', variant: 'info' });
                    } catch (error) {
                      if (import.meta.env.DEV) {
                        console.warn('Backend save failed (workout saved locally):', error);
                      }
                      setBanner({ message: 'Workout saved', variant: 'info' });
                    }
                  }
                  
                  setAdHocSession(null);
                  setScreen({ type: 'home' });
                  return;
                }
                
                // Not just completed - return to previous screen
                if (screen.previousScreen) {
                  // Add restoreKey for history screen to force re-render and scroll restoration
                  if (screen.previousScreen.type === 'history') {
                    setScreen({ 
                      ...screen.previousScreen, 
                      restoreKey: Date.now() 
                    });
                  } else {
                    setScreen(screen.previousScreen);
                  }
                } else {
                  setScreen({ type: 'home' });
                }
              }}
              onAddAnother={undefined}
              onEditExercise={(exerciseId) => {
                // Navigate to exercise session to edit
                const exercise = workout.exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                  setExerciseSessionSets(exercise.sets);
                  setScreen({ type: 'exercise-session', exerciseName: exercise.name });
                }
              }}
              onDelete={() => {
                // Delete workout from history
                deleteWorkouts([workout.id]);
                setBanner({ message: 'Workout deleted', variant: 'info' });
                // Navigate back to history
                if (screen.previousScreen && screen.previousScreen.type === 'history') {
                  setScreen({ 
                    ...screen.previousScreen, 
                    restoreKey: Date.now() 
                  });
                } else {
                  setScreen({ type: 'history' });
                }
              }}
              onStartAgain={() => {
                // Determine entry type and call appropriate repeat handler
                const isExerciseOnly = workout.exercises.length === 1 && workout.name === workout.exercises[0]?.name;
                if (isExerciseOnly) {
                  startExerciseSession(workout.exercises[0].name);
                } else {
                  startWorkoutFromHistory(workout.id);
                }
              }}
              onViewExerciseHistory={(exerciseName) => {
                setScreen({ 
                  type: 'exercise-history', 
                  exerciseName,
                  previousScreen: screen 
                });
              }}
            />
          );
        })()}

        {screen.type === 'exercise-history' && (() => {
          return (
            <ExerciseHistoryScreen
              exerciseName={screen.exerciseName}
              workouts={workoutHistory}
              onBack={() => {
                // Navigate back to previous screen if available, otherwise home
                if (screen.previousScreen) {
                  // Add restoreKey to force re-render and scroll restoration
                  if (screen.previousScreen.type === 'history') {
                    setScreen({ 
                      ...screen.previousScreen, 
                      restoreKey: Date.now() 
                    });
                  } else {
                    setScreen(screen.previousScreen);
                  }
                } else {
                  setScreen({ type: 'home' });
                }
              }}
              onViewWorkout={(workoutId) => {
                const workout = workouts.find(w => w.id === workoutId);
                const isExerciseOnly = workout && workout.exercises.length === 1 && workout.name === workout.exercises[0]?.name;
                setScreen({ 
                  type: 'workout-summary', 
                  workoutId, 
                  isSingleExercise: isExerciseOnly,
                  previousScreen: screen 
                });
              }}
            />
          );
        })()}

        {screen.type === 'settings' && (
          <SettingsScreen
            theme={theme}
            onThemeChange={(newTheme) => {
              setTheme(newTheme);
              setAppearance(newTheme);
            }}
            onUnitChange={handleUnitChange}
            onBack={() => {
              if (screen.previousScreen) {
                setScreen(screen.previousScreen);
              } else {
                setScreen({ type: 'home' });
              }
            }}
            onNavigateToBackups={() => setScreen({ type: 'backups-and-data', previousScreen: screen })}
          />
        )}

        {screen.type === 'backups-and-data' && (
          <BackupsAndDataScreen
            onBack={() => {
              if (screen.previousScreen) {
                setScreen(screen.previousScreen);
              } else {
                setScreen({ type: 'home' });
              }
            }}
            onDataImported={() => {
              // Reload state after import
              const result = loadState();
              if (result.success && result.state) {
                setWorkouts(result.state.workouts || []);
                setTemplates(result.state.templates || []);
                setIncompleteExerciseSession(result.state.incompleteExerciseSession ?? null);
                setAdHocSession(result.state.adHocSession ?? null);
              }
            }}
            onDataDeleted={() => {
              // Clear all state after deletion
              setWorkouts([]);
              setTemplates([]);
              setIncompleteExerciseSession(null);
              setAdHocSession(null);
            }}
          />
        )}

        {screen.type === 'history' && (
          <HistoryScreen
            key={`history-${screen.scrollPosition || 0}`}
            workouts={workoutHistory}
            theme={theme}
            onThemeChange={(newTheme) => {
              setTheme(newTheme);
              setAppearance(newTheme);
            }}
            onUnitChange={handleUnitChange}
            onOpenSettings={() => setScreen({ type: 'settings', previousScreen: { type: 'history', searchQuery: screen.searchQuery, scrollPosition: screen.scrollPosition } })}
            initialSearchQuery={screen.searchQuery}
            initialScrollPosition={screen.scrollPosition}
            onBack={() => setScreen({ type: 'home' })}
            onViewWorkout={(workoutId) => {
              const workout = workoutHistory.find(w => w.id === workoutId);
              const isExerciseOnly = workout && workout.exercises.length === 1 && workout.name === workout.exercises[0]?.name;
              setScreen({ 
                type: 'workout-summary', 
                workoutId, 
                isSingleExercise: isExerciseOnly,
                previousScreen: screen 
              });
            }}
            onViewExerciseHistory={(exerciseName) => setScreen({ 
              type: 'exercise-history', 
              exerciseName, 
              previousScreen: screen 
            })}
            onStartWorkout={startWorkoutFromHistory}
            onStartExercise={startExerciseSession}
            onDeleteWorkouts={deleteWorkouts}
            onStateChange={handleHistoryStateChange}
            onUpdateWorkoutName={updateWorkoutName}
          />
        )}

        {screen.type === 'start-logging' && (
          <StartLoggingScreen
            session={adHocSession}
            onBack={() => setScreen({ type: 'home' })}
            onAddExercise={(exerciseName) => {
              // Exercise is already added to session in StartLoggingScreen
              // This callback can be used for analytics or other side effects
            }}
            onRemoveExercise={(exerciseInstanceId) => {
              // Exercise is already removed from session in StartLoggingScreen
              // This callback can be used for analytics or other side effects
            }}
              onEnterSession={(sessionOverride) => {
                const s = sessionOverride ?? adHocSession;
                if (s) {
                  if (sessionOverride) setAdHocSession(sessionOverride);
                  beginFirstExerciseLog();
                  setScreen({ type: 'ad-hoc-session', sessionId: s.id });
                }
              }}
            onUpdateSession={(session) => setAdHocSession(session)}
          />
        )}

        {screen.type === 'ad-hoc-session' && (() => {
          const session = adHocSession;
          if (!session || session.id !== screen.sessionId) {
            // Session not found or stale - useEffect will redirect to Home; show skeleton meanwhile
            return (
              <div className="flex flex-col h-full items-center justify-center p-5" data-testid="ad-hoc-session-fallback">
                <div className="text-center space-y-4 max-w-md">
                  <p className="text-text-muted">Loading...</p>
                  <div className="h-8 w-32 bg-surface rounded animate-pulse mx-auto" />
                </div>
              </div>
            );
          }

          // Convert session exercises to Workout format for WorkoutSessionScreen
          const exercises: Exercise[] = session.exerciseOrder
            .map(id => session.exercises.find(ex => ex.id === id))
            .filter((ex): ex is NonNullable<typeof ex> => ex !== undefined)
            .map(ex => ({
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              isComplete: ex.isComplete || false,
              isSkipped: ex.isSkipped,
              groupId: ex.groupId || null,
            }));

          // Build last session data map
          const lastSessionData = new Map<string, { sets: Array<{ weight: number; reps: number }>; date: number }>();
          exercises.forEach(exercise => {
            const lastSession = getLastSessionForExercise(exercise.name, workouts);
            if (lastSession) {
              lastSessionData.set(exercise.name, lastSession);
            }
          });

          return (
            <WorkoutSessionScreen
              workoutName="Logging Session"
              exercises={exercises}
              lastSessionData={lastSessionData}
              allWorkouts={workouts}
              startedAt={session.startedAt}
              endedAt={session.endedAt || session.endTime}
              onEnsureStartedAt={() => {
                // Do NOT start timer here - timer starts when first set is logged
                // This callback is kept for compatibility but does nothing
              }}
              onBack={() => setScreen({ type: 'home' })}
              onAddExercise={(name: string, pairWithExerciseId?: string, swapWithExerciseId?: string, swapGroupId?: string) => {
                // Add exercise to session
                const exercise = getAllExercisesList().find(
                  ex => ex.name === name
                );
                if (!exercise) return;

                const now = Date.now();
                const exerciseInstanceId = `${session.id}-ex-${now}-${Math.random()}`;
                let updatedSession: AdHocLoggingSession = {
                  ...session,
                  exerciseOrder: [...session.exerciseOrder, exerciseInstanceId],
                  exercises: [
                    ...session.exercises,
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
                
                // If swap requested, swap the new exercise with the target in the group
                if (swapWithExerciseId && swapGroupId) {
                  const exercisesArray = updatedSession.exercises.map(ex => ({
                    id: ex.id,
                    name: ex.name,
                    sets: ex.sets,
                    isComplete: ex.isComplete || false,
                    groupId: ex.groupId || null,
                  }));
                  const swappedExercises = swapGroupMember(exercisesArray, swapGroupId, swapWithExerciseId, exerciseInstanceId);
                  // Map back to session format
                  const exerciseMap = new Map(updatedSession.exercises.map(ex => [ex.id, ex]));
                  updatedSession.exercises = swappedExercises.map(ex => {
                    const original = exerciseMap.get(ex.id);
                    if (original) {
                      return {
                        ...original,
                        groupId: ex.groupId,
                      };
                    }
                    // New exercise
                    return {
                      id: ex.id,
                      exerciseId: exercise.id,
                      name: ex.name,
                      source: exercise.source,
                      addedAt: now,
                      sets: ex.sets,
                      isComplete: ex.isComplete,
                      groupId: ex.groupId,
                    };
                  });
                  updatedSession = applyGroupingToSession(updatedSession, swappedExercises);
                } else if (pairWithExerciseId) {
                  // If pairing requested, group the new exercise with the target
                  const targetExercise = updatedSession.exercises.find(ex => ex.id === pairWithExerciseId);
                  if (targetExercise) {
                    const targetGroupId = targetExercise.groupId || `${session.id}-group-${now}-${Math.random()}`;
                    // Update exercises with groupId
                    const exercisesWithGrouping = updatedSession.exercises.map(ex => {
                      if (ex.id === exerciseInstanceId) {
                        return { ...ex, groupId: targetGroupId };
                      }
                      if (ex.id === pairWithExerciseId && !ex.groupId) {
                        return { ...ex, groupId: targetGroupId };
                      }
                      return ex;
                    });
                    // Ensure contiguity - pass the exercises array, not the groupId
                    updatedSession = applyGroupingToSession(updatedSession, exercisesWithGrouping);
                  }
                } else {
                  // Update classification and name when exercises change
                  const exerciseCount = updatedSession.exercises.length;
                  const reclassifiedSession = updateSessionClassificationAndName(updatedSession, exerciseCount);
                  setAdHocSession(reclassifiedSession);
                  return;
                }
                
                // Update classification and name when exercises change
                const exerciseCount = updatedSession.exercises.length;
                const reclassifiedSession = updateSessionClassificationAndName(updatedSession, exerciseCount);
                setAdHocSession(reclassifiedSession);
              }}
              onAddSet={(exerciseId, weight, reps, restDuration) => {
                const now = Date.now();
                const exercise = session.exercises.find(ex => ex.id === exerciseId);
                const isFirstSet = session.exercises.every(ex => ex.sets.length === 0);
                
                // Start timer if this is the first set in the session
                if (isFirstSet) {
                  beginFirstExerciseLog();
                }
                
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (ex.id === exerciseId) {
                      // If exercise was complete, reactivate it when a new set is added
                      const wasComplete = ex.isComplete;
                      return {
                        ...ex,
                        sets: [...ex.sets, {
                          id: now.toString(),
                          weight,
                          reps,
                          timestamp: now,
                          restDuration,
                        }],
                        // Reactivate exercise if it was previously complete
                        isComplete: wasComplete ? false : ex.isComplete,
                        // Persist timestamp of last set for rest timer
                        lastSetAt: now,
                      };
                    }
                    return ex;
                  }),
                  // Update session-level lastSetAt and lastSetOwnerId
                  lastSetAt: now,
                  lastSetOwnerId: exercise?.groupId || exerciseId,
                };
                setAdHocSession(updatedSession);
              }}
              onAddSupersetSet={(exercises, supersetSetId) => {
                const now = Date.now();
                // Find the groupId from the first exercise in the superset
                const firstExercise = session.exercises.find(ex => exercises.some(e => e.exerciseId === ex.id));
                const groupId = firstExercise?.groupId || null;
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    const exerciseData = exercises.find(e => e.exerciseId === ex.id);
                    if (exerciseData) {
                      // If exercise was complete, reactivate it when a new set is added
                      const wasComplete = ex.isComplete;
                      return {
                        ...ex,
                        sets: [...ex.sets, {
                          id: now.toString() + '-' + ex.id,
                          weight: exerciseData.weight,
                          reps: exerciseData.reps,
                          timestamp: now,
                          supersetSetId,
                        }],
                        // Reactivate exercise if it was previously complete
                        isComplete: wasComplete ? false : ex.isComplete,
                        // Persist timestamp of last set for rest timer (all exercises in superset get same timestamp)
                        lastSetAt: now,
                      };
                    }
                    return ex;
                  }),
                  // Update session-level lastSetAt and lastSetOwnerId (use groupId for supersets)
                  lastSetAt: now,
                  lastSetOwnerId: groupId,
                };
                setAdHocSession(updatedSession);
              }}
              onDeleteSet={(exerciseId, setId) => {
                const updatedExercises = session.exercises.map(ex => {
                  if (ex.id === exerciseId) {
                    const updatedSets = ex.sets.filter(s => s.id !== setId);
                    // Update lastSetAt: use most recent set timestamp if sets remain, otherwise clear
                    const newLastSetAt = updatedSets.length > 0
                      ? Math.max(...updatedSets.map(s => s.timestamp))
                      : undefined;
                    return {
                      ...ex,
                      sets: updatedSets,
                      lastSetAt: newLastSetAt,
                    };
                  }
                  return ex;
                });
                // Recalculate session-level lastSetAt from all exercises
                const allSets = updatedExercises.flatMap(ex => ex.sets);
                const sessionLastSetAt = allSets.length > 0
                  ? Math.max(...allSets.map(s => s.timestamp))
                  : null;
                // Find the owner of the most recent set
                let sessionLastSetOwnerId: string | null = null;
                if (sessionLastSetAt) {
                  for (const ex of updatedExercises) {
                    const hasMostRecent = ex.sets.some(s => s.timestamp === sessionLastSetAt);
                    if (hasMostRecent) {
                      sessionLastSetOwnerId = ex.groupId || ex.id;
                      break;
                    }
                  }
                }
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: updatedExercises,
                  lastSetAt: sessionLastSetAt,
                  lastSetOwnerId: sessionLastSetOwnerId,
                };
                setAdHocSession(updatedSession);
              }}
              onUpdateSet={(exerciseId, setId, weight, reps) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (ex.id === exerciseId) {
                      return {
                        ...ex,
                        sets: ex.sets.map(s => {
                          if (s.id === setId) {
                            return {
                              ...s,
                              weight,
                              reps,
                            };
                          }
                          return s;
                        }),
                      };
                    }
                    return ex;
                  }),
                };
                setAdHocSession(updatedSession);
              }}
              onCompleteExercise={(exerciseId) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (ex.id === exerciseId) {
                      return { ...ex, isComplete: true };
                    }
                    return ex;
                  }),
                };
                setAdHocSession(updatedSession);
              }}
              onCompleteGroup={(exerciseIds) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (exerciseIds.includes(ex.id)) {
                      return { ...ex, isComplete: true };
                    }
                    return ex;
                  }),
                };
                setAdHocSession(updatedSession);
              }}
              onSkipExercise={(exerciseId) => {
                // Skip standalone exercise - mark as complete
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (ex.id === exerciseId) {
                      return { ...ex, isComplete: true };
                    }
                    return ex;
                  }),
                };
                setAdHocSession(updatedSession);
              }}
              onSkipExerciseInGroup={(exerciseId) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex =>
                    ex.id === exerciseId ? { ...ex, isSkipped: true } : ex
                  ),
                };
                setAdHocSession(updatedSession);
              }}
              onUnskipExerciseInGroup={(exerciseId) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex =>
                    ex.id === exerciseId ? { ...ex, isSkipped: false } : ex
                  ),
                };
                setAdHocSession(updatedSession);
              }}
              onDeferExercise={(exerciseId) => {
                // Move to end
                const exercise = session.exercises.find(ex => ex.id === exerciseId);
                if (!exercise) return;

                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exerciseOrder: [
                    ...session.exerciseOrder.filter(id => id !== exerciseId),
                    exerciseId,
                  ],
                };
                setAdHocSession(updatedSession);
              }}
              onSwapExercise={(exerciseId, newExerciseName) => {
                // Find replacement exercise
                const replacement = getAllExercisesList().find(ex => ex.name === newExerciseName);
                if (!replacement) return;

                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex => {
                    if (ex.id === exerciseId) {
                      return {
                        ...ex,
                        exerciseId: replacement.id,
                        name: replacement.name,
                        source: replacement.source,
                        sets: [], // Start fresh
                        isComplete: false,
                      };
                    }
                    return ex;
                  }),
                };
                setAdHocSession(updatedSession);
              }}
              onReorderExercises={(newExercises) => {
                // Preserve groupId when reordering
                const exerciseMap = new Map(session.exercises.map(ex => [ex.id, ex]));
                const reorderedExercises = newExercises.map(ex => {
                  const sessionEx = exerciseMap.get(ex.id);
                  return {
                    ...sessionEx!,
                    groupId: ex.groupId || sessionEx?.groupId || null,
                  };
                });
                
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exerciseOrder: newExercises.map(ex => ex.id),
                  exercises: reorderedExercises,
                };
                setAdHocSession(updatedSession);
              }}
              onGroupExercises={(instanceIds) => {
                const updatedExercises = createGroup(exercises, instanceIds);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onAddToGroup={(groupId, instanceId) => {
                const updatedExercises = addToGroup(exercises, groupId, instanceId);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onMergeGroups={(groupId1, groupId2) => {
                const updatedExercises = mergeGroups(exercises, groupId1, groupId2);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onUngroup={(instanceId) => {
                const updatedExercises = ungroup(exercises, instanceId);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onUngroupGroup={(groupId) => {
                const updatedExercises = ungroupAll(exercises, groupId);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onSkipGroup={(exerciseIds) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exercises: session.exercises.map(ex =>
                    exerciseIds.includes(ex.id) ? { ...ex, isComplete: true } : ex
                  ),
                };
                setAdHocSession(updatedSession);
              }}
              onDeferGroup={(exerciseIds) => {
                const otherIds = session.exerciseOrder.filter(id => !exerciseIds.includes(id));
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exerciseOrder: [...otherIds, ...exerciseIds],
                };
                setAdHocSession(updatedSession);
              }}
              onDeleteGroup={(exerciseIds) => {
                const updatedSession: AdHocLoggingSession = {
                  ...session,
                  exerciseOrder: session.exerciseOrder.filter(id => !exerciseIds.includes(id)),
                  exercises: session.exercises.filter(ex => !exerciseIds.includes(ex.id)),
                };
                setAdHocSession(updatedSession);
              }}
              onSwapGroupMember={(groupId, sourceMemberInstanceId, replacementInstanceId) => {
                const updatedExercises = swapGroupMember(exercises, groupId, sourceMemberInstanceId, replacementInstanceId);
                const updatedSession = applyGroupingToSession(session, updatedExercises);
                setAdHocSession(updatedSession);
              }}
              onFinishWorkout={() => {
                // Classify and name the session
                const exerciseCount = exercises.length;
                const updatedSession = updateSessionClassificationAndName(session, exerciseCount);
                
                const endedAt = Date.now();
                const startedAt = updatedSession.startedAt || updatedSession.startTime || endedAt;

                // Convert session to workout and save
                const workout: Workout = {
                  id: Date.now().toString(),
                  name: updatedSession.name || generateDefaultSessionName(updatedSession, exerciseCount),
                  exercises: exercises,
                  startTime: startedAt,
                  endTime: endedAt,
                  startedAt,
                  endedAt,
                  durationSec: computeDurationSec(startedAt, endedAt),
                  isComplete: true,
                  isUserNamed: updatedSession.isUserNamed,
                  sessionType: updatedSession.sessionType,
                };
                setWorkouts([...workouts, workout]);
                
                // Mark session as completed
                const completedSession: AdHocLoggingSession = {
                  ...updatedSession,
                  status: 'completed',
                  startTime: startedAt,
                  startedAt,
                  endTime: endedAt,
                  endedAt,
                  durationSec: updatedSession.durationSec ?? computeDurationSec(startedAt, endedAt),
                };
                setAdHocSession(null); // Clear active session
                saveAdHocLoggingSession(completedSession);
                
                // Navigate to summary
                const isSingleExercise = exerciseCount === 1;
                setScreen({ 
                  type: 'workout-summary', 
                  workoutId: workout.id, 
                  isJustCompleted: true,
                  isSingleExercise,
                  previousScreen: { type: 'home' }
                });
              }}
            />
          );
        })()}
      </div>

      {/* Bottom nav bar - hide during workout, exercise, and search flows */}
      {!(
        screen.type === 'create-template' ||
        screen.type === 'view-template' ||
        screen.type === 'workout-session' ||
        screen.type === 'workout-summary' ||
        screen.type === 'exercise-session' ||
        screen.type === 'settings' ||
        screen.type === 'backups-and-data' ||
        screen.type === 'ad-hoc-session' ||
        screen.type === 'start-logging' ||
        exerciseSearchOverlay != null
      ) && (
        <nav className="fixed bottom-0 left-0 right-0 pb-6 pt-4 px-4 z-50">
          <div className="max-w-md mx-auto">
            {/* Pill toggle container */}
            <div className="relative bg-panel/40 backdrop-blur-xl rounded-full p-1 border border-border-subtle/50 shadow-lg">
              {/* Sliding background indicator */}
              <div 
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-accent/10 backdrop-blur-sm rounded-full transition-transform duration-200 ease-out border border-accent/20"
                style={{
                  transform: (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings' || screen.type === 'backups-and-data') ? 'translateX(100%)' : 'translateX(0)',
                }}
              />
              
              {/* Navigation buttons */}
              <div className="relative grid grid-cols-2">
                <button
                  onClick={() => setScreen({ type: 'home' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    !(screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings' || screen.type === 'backups-and-data') ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-sm font-medium">Train</span>
                </button>
                <button
                  onClick={() => setScreen({ type: 'history' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings' || screen.type === 'backups-and-data') ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">History</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Full-screen exercise search overlay (replaces Log Exercise modal) */}
      {exerciseSearchOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col bg-panel">
          <ExerciseSearchScreen
            title={exerciseSearchOverlay.title}
            onBack={() => {
              exerciseSearchOverlay.onBack();
              setExerciseSearchOverlay(null);
            }}
            onSelectExercise={(name) => {
              exerciseSearchOverlay.onSelect(name);
            }}
            onAddNewExercise={exerciseSearchOverlay.onAddNewExercise}
            selectedExercises={exerciseSearchOverlay.selectedExercises}
            inSessionExercises={exerciseSearchOverlay.inSessionExercises}
            mode={exerciseSearchOverlay.mode}
            createButtonLabel={exerciseSearchOverlay.createButtonLabel}
            swapContext={exerciseSearchOverlay.swapContext}
          />
        </div>
      )}


      <Modal
        isOpen={showFinishConfirm}
        onClose={() => {
          setShowFinishConfirm(false);
          setFinishWorkoutId(null);
        }}
        title="Incomplete Exercises"
      >
        <p className="text-text-muted mb-6">
          Some exercises don't have any sets logged. Do you want to save your entry or discard this session?
        </p>
        <div className="flex gap-3">
          <Button 
            variant="neutral" 
            onClick={() => {
              if (finishWorkoutId) {
                discardWorkout(finishWorkoutId);
              }
              setShowFinishConfirm(false);
              setFinishWorkoutId(null);
            }} 
            className="flex-1"
          >
            Discard
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (finishWorkoutId) {
                savePartialWorkout(finishWorkoutId);
              }
              setShowFinishConfirm(false);
              setFinishWorkoutId(null);
            }}
            className="flex-1"
          >
            Save Entry
          </Button>
        </div>
      </Modal>


      {/* Session Conflict Modal */}
      {showSessionConflict && (incompleteExerciseSession || unfinishedWorkout) && pendingAction && (
        <SessionConflictModal
          isOpen={showSessionConflict}
          onClose={() => {
            setShowSessionConflict(false);
            setPendingAction(null);
          }}
          inProgressSessionType={incompleteExerciseSession ? 'exercise' : 'workout'}
          requestedSessionType={pendingAction.type}
          sessionName={incompleteExerciseSession ? incompleteExerciseSession.exerciseName : unfinishedWorkout?.name || ''}
          onResume={handleResumeConflictSession}
          onDiscard={handleDiscardConflictSession}
          onSaveAndContinue={handleSaveAndContinueConflictSession}
        />
      )}

      {/* Banner */}
      {banner && (
        <Banner
          message={banner.message}
          variant={banner.variant}
          onDismiss={() => setBanner(null)}
          autoHide={3000}
        />
      )}
    </div>
  );
}