import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Banner } from './components/Banner';
import { Modal } from './components/Modal';
import { ExerciseSearchBottomSheet } from './components/ExerciseSearchBottomSheet';
import { LogExerciseSearch } from './components/LogExerciseSearch';
import { ExerciseSearchHandle } from './components/ExerciseSearch';
import { SessionConflictModal } from './components/SessionConflictModal';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Workout, Exercise, Screen } from './types';
import { WorkoutTemplate } from './types/templates';
import { IncompleteExerciseSession } from './types';
import { saveWorkouts, loadWorkouts, getUnfinishedWorkout, getWorkoutHistory, getLastSessionForExercise, saveIncompleteExerciseSession, loadIncompleteExerciseSession, saveIncompleteWorkoutId, loadIncompleteWorkoutId } from './utils/storage';
import { loadTemplates, saveTemplate, deleteTemplate, saveTemplates } from './utils/templateStorage';
import { addExerciseToDb, loadExercisesDB, searchExercises, initializeExerciseDatabase, ExerciseDBEntry, getAllExercisesList } from './utils/exerciseDb';
import { saveWorkout, deleteWorkouts as deleteWorkoutsApi } from './utils/api';
import { recordSwap } from '../utils/exerciseSwapHistory';
import { loadPreferences, getAppearance, setAppearance } from '../utils/preferences';


type AppScreen = 
  | { type: 'home' }
  | { type: 'create-template' }
  | { type: 'view-template'; templateId: string }
  | { type: 'workout-session'; workoutId: string }
  | { type: 'exercise-session'; exerciseName: string }
  | { type: 'workout-summary'; workoutId: string; isJustCompleted?: boolean; isSingleExercise?: boolean; previousScreen?: AppScreen }
  | { type: 'exercise-history'; exerciseName: string; previousScreen?: AppScreen }
  | { type: 'history'; searchQuery?: string; scrollPosition?: number; restoreKey?: number }
  | { type: 'settings'; previousScreen?: AppScreen };

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(() => loadWorkouts());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => loadTemplates());
  const [screen, setScreen] = useState<AppScreen>({ type: 'home' });
  const [banner, setBanner] = useState<{ message: string; variant: 'info' | 'warning' | 'error' } | null>(null);
  const [showLogExercise, setShowLogExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSessionSets, setExerciseSessionSets] = useState<any[]>([]);
  const [incompleteExerciseSession, setIncompleteExerciseSession] = useState<IncompleteExerciseSession | null>(() => loadIncompleteExerciseSession());
  const [exerciseRestTimerStart, setExerciseRestTimerStart] = useState<number | null>(null);
  const [showExerciseComplete, setShowExerciseComplete] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishWorkoutId, setFinishWorkoutId] = useState<string | null>(null);
  // Load preferences on mount
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [unitChangeKey, setUnitChangeKey] = useState(0); // Trigger re-renders when units change
  const logExerciseSearchRef = useRef<ExerciseSearchHandle>(null);
  
  const handleUnitChange = () => {
    setUnitChangeKey(prev => prev + 1);
  };
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Load from preferences first, fallback to old localStorage key, then system preference
    const prefs = loadPreferences();
    if (prefs.appearance) {
      return prefs.appearance;
    }
    const savedTheme = localStorage.getItem('workout-app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
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
          endTime: Date.now(),
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
          setWorkouts(workouts.map(w => {
            if (w.id === workout.id) {
              return {
                ...w,
                exercises: exercisesWithSets,
                isComplete: true,
                endTime: Date.now(),
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
    const newWorkout: Workout = {
      id: workoutId,
      name: template.name,
      exercises: template.exerciseNames.map((name, idx) => ({
        id: `${workoutId}-ex-${idx}-${Math.random()}`,
        name,
        sets: [],
        isComplete: false,
      })),
      startTime: Date.now(),
      isComplete: false,
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
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: 'Quick Workout',
      exercises: [],
      startTime: Date.now(),
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  const createWorkoutInternal = (name: string) => {
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name,
      exercises: [],
      startTime: Date.now(),
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Navigate directly to active workout session (not completion screen)
    // Clear any exercise-session screen state first to prevent navigation to completion screen
    setScreen({ type: 'workout-session', workoutId: newWorkout.id });
  };

  const startExerciseSessionInternal = (name: string) => {
    setExerciseSessionSets([]);
    setScreen({ type: 'exercise-session', exerciseName: name });
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
      console.warn('Cannot repeat workout with no logged exercises');
      return;
    }

    const newWorkout: Workout = {
      id: `${Date.now()}-${Math.random()}`, // Ensure unique ID
      name: workout.name,
      exercises: exercisesFromHistory,
      startTime: Date.now(),
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

  const startExerciseSession = (name: string) => {
    checkSessionConflict(
      () => startExerciseSessionInternal(name),
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
      console.log('[App] Exercise already exists or error adding:', error);
    }
    startExerciseSession(name);
    setBanner({ message: `Selected exercise: ${name}`, variant: 'info' });
  };

  const handleAddNewExerciseFromModal = (name: string) => {
    addExerciseToDb(name);
    startExerciseSession(name);
    setBanner({ message: `Exercise "${name}" added successfully`, variant: 'info' });
  };

  const addExerciseToWorkout = (workoutId: string, exerciseName: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const newExercise: Exercise = {
          id: Date.now().toString(),
          name: exerciseName,
          sets: [],
        };
        return { ...w, exercises: [...w.exercises, newExercise] };
      }
      return w;
    }));
    addExerciseToDb(exerciseName);
  };

  const addSetToExercise = (workoutId: string, exerciseId: string, weight: number, reps: number, restDuration?: number) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                sets: [...ex.sets, {
                  id: Date.now().toString(),
                  weight,
                  reps,
                  timestamp: Date.now(),
                  restDuration,
                }],
              };
            }
            return ex;
          }),
        };
      }
      return w;
    }));
  };

  const deleteSetFromExercise = (workoutId: string, exerciseId: string, setId: string) => {
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.filter(s => s.id !== setId),
              };
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
    // Remove exercise from workout
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

    // Replace the exercise in the slot
    // Original exercise's sets remain attached to the original exercise (not moved)
    // The replacement exercise starts fresh with no sets
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              // Replace exercise: new name, new ID, empty sets
              // Original sets stay on original exercise (they're not moved)
              return {
                id: Date.now().toString() + Math.random(), // New ID for replacement
                name: newExerciseName,
                sets: [], // Start fresh - original sets remain on original exercise
                isComplete: false, // Reset completion status
              };
            }
            return ex;
          }),
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
        return { ...w, isComplete: true, endTime: Date.now() };
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
        return { 
          ...w, 
          exercises: completedExercises,
          isComplete: true, 
          endTime: Date.now() 
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
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: exerciseName,
      exercises: [{
        id: Date.now().toString(),
        name: exerciseName,
        sets,
      }],
      startTime: Date.now(),
      endTime: Date.now(),
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
    
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: screen.exerciseName,
      exercises: [{
        id: Date.now().toString(),
        name: screen.exerciseName,
        sets: exerciseSessionSets,
        isComplete: true,
      }],
      startTime: Date.now(),
      endTime: Date.now(),
      isComplete: true,
    };
    setWorkouts([...workouts, newWorkout]);
    setShowExerciseComplete(false);
    setExerciseSessionSets([]);
    setIncompleteExerciseSession(null);
    // Mark as single exercise session so we don't double-save
    setScreen({ type: 'workout-summary', workoutId: newWorkout.id, isJustCompleted: true, isSingleExercise: true });
  };

  // Convert exercise session to workout
  const convertExerciseToWorkout = () => {
    if (screen.type !== 'exercise-session') return;
    
    const workoutName = generateWorkoutNumber();
    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workoutName,
      exercises: [{
        id: Date.now().toString(),
        name: screen.exerciseName,
        sets: exerciseSessionSets,
        isComplete: true,
      }],
      startTime: Date.now(),
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
    setShowLogExercise(true);
  };

  // Handle exercise session back - save as incomplete if sets exist
  const handleExerciseSessionBack = (restTimerStart: number | null) => {
    if (exerciseSessionSets.length > 0 && screen.type === 'exercise-session') {
      // Save as incomplete with timer state
      setIncompleteExerciseSession({
        exerciseName: screen.exerciseName,
        sets: exerciseSessionSets,
        startTime: Date.now(),
        restTimerStart: restTimerStart,
      });
    } else {
      // Clear incomplete if no sets
      setIncompleteExerciseSession(null);
    }
    setExerciseSessionSets([]);
    setExerciseRestTimerStart(null);
    setScreen({ type: 'home' });
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

  return (
    <div className="size-full flex flex-col bg-background">
      {/* Main content area with bottom padding for fixed nav (only when nav is visible) */}
      <div className={`flex-1 overflow-hidden flex flex-col ${
        !(
          screen.type === 'create-template' ||
          screen.type === 'view-template' ||
          screen.type === 'workout-session' ||
          screen.type === 'workout-summary' ||
          screen.type === 'exercise-session'
        ) ? 'pb-24' : ''
      }`}>

        {screen.type === 'home' && (
          <HomeScreen
            unfinishedWorkout={unfinishedWorkout}
            incompleteExerciseSession={incompleteExerciseSession}
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
            onLogExercise={() => setShowLogExercise(true)}
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
          />
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
          
          return (
            <ViewTemplateScreen
              template={template}
              lastSessionData={lastSessionData}
              onBack={() => setScreen({ type: 'home' })}
              onStart={(editedExerciseNames) => {
                // Create workout with edited exercises (editedExerciseNames is always provided)
                checkSessionConflict(
                  () => {
                    const workoutId = `${Date.now()}-${Math.random()}`;
                    const newWorkout: Workout = {
                      id: workoutId,
                      name: template.name,
                      exercises: editedExerciseNames.map((name, idx) => ({
                        id: `${workoutId}-ex-${idx}-${Math.random()}`,
                        name,
                        sets: [],
                        isComplete: false,
                      })),
                      startTime: Date.now(),
                      isComplete: false,
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
              onBack={() => setScreen({ type: 'home' })}
              onAddExercise={(name) => addExerciseToWorkout(workout.id, name)}
              onAddSet={(exerciseId, weight, reps) => addSetToExercise(workout.id, exerciseId, weight, reps)}
              onDeleteSet={(exerciseId, setId) => deleteSetFromExercise(workout.id, exerciseId, setId)}
              onCompleteExercise={(exerciseId) => completeExercise(workout.id, exerciseId)}
              onSkipExercise={(exerciseId) => skipExercise(workout.id, exerciseId)}
              onDeferExercise={(exerciseId) => deferExercise(workout.id, exerciseId)}
              onSwapExercise={(exerciseId, newExerciseName) => swapExercise(workout.id, exerciseId, newExerciseName)}
              onReorderExercises={(newExercises) => reorderExercises(workout.id, newExercises)}
              onFinishWorkout={() => finishWorkout(workout.id)}
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
              initialRestTimerStart={incompleteExerciseSession?.restTimerStart || null}
              onBack={(restTimerStart) => handleExerciseSessionBack(restTimerStart)}
              onAddSet={(weight, reps, restDuration) => {
                setExerciseSessionSets([...exerciseSessionSets, {
                  id: Date.now().toString(),
                  weight,
                  reps,
                  timestamp: Date.now(),
                  restDuration,
                }]);
              }}
              onDeleteSet={(setId) => {
                setExerciseSessionSets(exerciseSessionSets.filter(s => s.id !== setId));
              }}
              onFinish={() => handleExerciseComplete()}
              onRestTimerChange={(restTimerStart) => setExerciseRestTimerStart(restTimerStart)}
            />
          );
        })()}

        {screen.type === 'workout-summary' && (() => {
          const workout = workouts.find(w => w.id === screen.workoutId);
          if (!workout) return null;
          return (
            <WorkoutSummaryScreen
              workout={workout}
              isJustCompleted={screen.isJustCompleted}
              isSingleExercise={screen.isSingleExercise}
              onBack={async () => {
                // If just completed and not a single exercise, try to save to backend
                // Single exercises are already saved in confirmFinishExercise, so skip saving here
                // Note: Workout is already saved locally, so backend save is optional
                if (screen.isJustCompleted && !screen.isSingleExercise) {
                  try {
                    console.log('Saving workout:', workout);
                    await saveWorkout(workout);
                    setBanner({ message: 'Workout logged', variant: 'info' });
                  } catch (error) {
                    // Silently fail - workout is already saved locally
                    // Only log to console for debugging
                    console.warn('Backend save failed (workout saved locally):', error);
                  }
                }
                
                // If just completed, return to home screen
                // Otherwise, return to previous screen (e.g., history page) if available
                if (screen.isJustCompleted) {
                  setScreen({ type: 'home' });
                } else if (screen.previousScreen) {
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
                // Delete the workout entry
                deleteWorkouts([workout.id]);
                // Navigate back to history if we came from there, otherwise home
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
          />
        )}
      </div>

      {/* Bottom nav bar - hide during workout and exercise flows */}
      {!(
        screen.type === 'create-template' ||
        screen.type === 'view-template' ||
        screen.type === 'workout-session' ||
        screen.type === 'workout-summary' ||
        screen.type === 'exercise-session' ||
        screen.type === 'settings'
      ) && (
        <nav className="fixed bottom-0 left-0 right-0 pb-6 pt-4 px-4 z-50">
          <div className="max-w-md mx-auto">
            {/* Pill toggle container */}
            <div className="relative bg-panel/40 backdrop-blur-xl rounded-full p-1 border border-border-subtle/50 shadow-lg">
              {/* Sliding background indicator */}
              <div 
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-accent/10 backdrop-blur-sm rounded-full transition-transform duration-200 ease-out border border-accent/20"
                style={{
                  transform: (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings') ? 'translateX(100%)' : 'translateX(0)',
                }}
              />
              
              {/* Navigation buttons */}
              <div className="relative grid grid-cols-2">
                <button
                  onClick={() => setScreen({ type: 'home' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    !(screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings') ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-sm font-medium">Train</span>
                </button>
                <button
                  onClick={() => setScreen({ type: 'history' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history' || screen.type === 'settings') ? 'text-accent' : 'text-text-muted'
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

      {/* Modals */}
      <ExerciseSearchBottomSheet
        isOpen={showLogExercise}
        onClose={() => {
          setShowLogExercise(false);
          setExerciseName('');
        }}
        title="Log Exercise"
        onScrollStart={() => logExerciseSearchRef.current?.blur()}
      >
        <LogExerciseSearch
          ref={logExerciseSearchRef}
          onSelectExercise={handleLogExerciseFromModal}
          onAddNewExercise={handleAddNewExerciseFromModal}
        />
      </ExerciseSearchBottomSheet>

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