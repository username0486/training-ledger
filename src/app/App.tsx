import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, UserCircle, Edit2, List } from 'lucide-react';
import { HomeScreen } from './screens/HomeScreen';
import { CreateWorkoutScreen } from './screens/CreateWorkoutScreen';
import { ViewTemplateScreen } from './screens/ViewTemplateScreen';
import { WorkoutSessionScreen } from './screens/WorkoutSessionScreen';
import { ExerciseSessionScreen } from './screens/ExerciseSessionScreen';
import { WorkoutSummaryScreen } from './screens/WorkoutSummaryScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { Banner } from './components/Banner';
import { Modal } from './components/Modal';
import { SessionConflictModal } from './components/SessionConflictModal';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Workout, Exercise, Screen } from './types';
import { WorkoutTemplate } from './types/templates';
import { IncompleteExerciseSession } from './types';
import { saveWorkouts, loadWorkouts, getUnfinishedWorkout, getWorkoutHistory, getLastSessionForExercise, saveIncompleteExerciseSession, loadIncompleteExerciseSession, saveIncompleteWorkoutId, loadIncompleteWorkoutId } from './utils/storage';
import { loadTemplates, saveTemplate, deleteTemplate, saveTemplates } from './utils/templateStorage';
import { addExerciseToDb, loadExercisesDB, searchExercises } from './utils/exerciseDb';
import { getSession, signOut, User } from './utils/auth';
import { fetchWorkouts, saveWorkout, deleteWorkouts as deleteWorkoutsApi, fetchTemplates, saveTemplate as saveTemplateApi, deleteTemplate as deleteTemplateApi } from './utils/api';


type AppScreen = 
  | { type: 'home' }
  | { type: 'create-template' }
  | { type: 'view-template'; templateId: string }
  | { type: 'workout-session'; workoutId: string }
  | { type: 'exercise-session'; exerciseName: string }
  | { type: 'workout-summary'; workoutId: string; isJustCompleted?: boolean; isSingleExercise?: boolean; previousScreen?: AppScreen }
  | { type: 'exercise-history'; exerciseName: string; previousScreen?: AppScreen }
  | { type: 'history'; searchQuery?: string; scrollPosition?: number; restoreKey?: number }
  | { type: 'auth' }
  | { type: 'profile' };

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
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Load theme from localStorage, default to 'dark'
    const savedTheme = localStorage.getItem('workout-app-theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });
  
  // Session conflict state
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'workout' | 'exercise';
    data: any;
  } | null>(null);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    // Save theme preference
    localStorage.setItem('workout-app-theme', theme);
  }, [theme]);

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

  const handleSaveAndContinueConflictSession = () => {
    // Save existing session
    if (incompleteExerciseSession && screen.type === 'exercise-session') {
      const workout: Workout = {
        id: Date.now().toString(),
        name: incompleteExerciseSession.exerciseName,
        exercises: [{
          id: Date.now().toString(),
          name: incompleteExerciseSession.exerciseName,
          sets: incompleteExerciseSession.sets,
          isComplete: true,
        }],
        startTime: Date.now(),
        endTime: Date.now(),
        isComplete: true,
      };
      setWorkouts([...workouts, workout]);
      setIncompleteExerciseSession(null);
      setExerciseSessionSets([]);
    }
    
    if (unfinishedWorkout) {
      // Mark workout as complete
      const completedWorkout = workouts.find(w => w.id === unfinishedWorkout.id);
      if (completedWorkout && completedWorkout.exercises.some(ex => ex.sets.length > 0)) {
        // Save with only exercises that have sets
        setWorkouts(workouts.map(w => {
          if (w.id === unfinishedWorkout.id) {
            return {
              ...w,
              exercises: w.exercises.filter(ex => ex.sets.length > 0),
              isComplete: true,
              endTime: Date.now(),
            };
          }
          return w;
        }));
      } else {
        // Discard if no sets
        setWorkouts(workouts.filter(w => w.id !== unfinishedWorkout.id));
      }
    }
    
    // Execute pending action
    if (pendingAction) {
      executePendingAction();
    }
    
    setShowSessionConflict(false);
    setPendingAction(null);
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
    if (!template) return;

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: template.name,
      exercises: template.exerciseNames.map(name => ({
        id: Date.now().toString() + Math.random(),
        name,
        sets: [],
      })),
      startTime: Date.now(),
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Use setTimeout to ensure state update completes before navigation
    setTimeout(() => {
      setScreen({ type: 'workout-session', workoutId: newWorkout.id });
    }, 0);
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
    // Use setTimeout to ensure state update completes before navigation
    setTimeout(() => {
      setScreen({ type: 'workout-session', workoutId: newWorkout.id });
    }, 0);
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
    // Use setTimeout to ensure state update completes before navigation
    setTimeout(() => {
      setScreen({ type: 'workout-session', workoutId: newWorkout.id });
    }, 0);
  };

  const startExerciseSessionInternal = (name: string) => {
    setExerciseSessionSets([]);
    setScreen({ type: 'exercise-session', exerciseName: name });
    setShowLogExercise(false);
    setExerciseName('');
  };

  const startWorkoutFromHistoryInternal = (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    const newWorkout: Workout = {
      id: Date.now().toString(),
      name: workout.name,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        id: Date.now().toString() + Math.random(),
        sets: [],
      })),
      startTime: Date.now(),
      isComplete: false,
    };
    setWorkouts(prev => [...prev, newWorkout]);
    saveIncompleteWorkoutId(newWorkout.id);
    // Use setTimeout to ensure state update completes before navigation
    setTimeout(() => {
      setScreen({ type: 'workout-session', workoutId: newWorkout.id });
    }, 0);
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
    addExerciseToDb(name);
    startExerciseSession(name);
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
    // Move exercise after the next incomplete exercise
    setWorkouts(workouts.map(w => {
      if (w.id === workoutId) {
        const exerciseIndex = w.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex === -1) return w;
        
        const exercise = w.exercises[exerciseIndex];
        const nextIncompleteIndex = w.exercises.findIndex((ex, idx) => 
          idx > exerciseIndex && !ex.isComplete
        );
        
        // If no next incomplete exercise, move to end
        const targetIndex = nextIncompleteIndex === -1 
          ? w.exercises.length - 1 
          : nextIncompleteIndex;
        
        const newExercises = [...w.exercises];
        newExercises.splice(exerciseIndex, 1);
        newExercises.splice(targetIndex, 0, exercise);
        
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
    setBanner({ message: 'Workout discarded', variant: 'info' });
    setScreen({ type: 'home' });
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
    setBanner({ message: `Deleted ${workoutIds.length} workout${workoutIds.length === 1 ? '' : 's'}`, variant: 'info' });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session.user) {
        setUser(session.user);
      } else {
        setScreen({ type: 'auth' });
      }
    };
    checkAuth();
  }, []);

  const handleAuthSuccess = async () => {
    const session = await getSession();
    if (session.user) {
      setUser(session.user);
      setScreen({ type: 'home' });
    }
  };

  const handleLogOut = async () => {
    await signOut();
    setUser(null);
    setScreen({ type: 'auth' });
  };

  // Memoized callback for HistoryScreen state changes to prevent infinite loops
  const handleHistoryStateChange = useCallback((searchQuery: string, scrollPosition: number) => {
    setScreen({ type: 'history', searchQuery, scrollPosition });
  }, []);

  // Show auth screen if not logged in
  if (!user && screen.type !== 'auth') {
    return (
      <div className="size-full flex flex-col bg-background">
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-background">
      {/* Main content area with bottom padding for fixed nav */}
      <div className="flex-1 overflow-hidden flex flex-col pb-24">
        {screen.type === 'auth' && (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}

        {screen.type === 'profile' && user && (
          <ProfileScreen
            user={user}
            theme={theme}
            onBack={() => setScreen({ type: 'home' })}
            onLogOut={handleLogOut}
            onThemeChange={setTheme}
          />
        )}

        {screen.type === 'home' && (
          <HomeScreen
            unfinishedWorkout={unfinishedWorkout}
            incompleteExerciseSession={incompleteExerciseSession}
            workoutTemplates={templates}
            user={user}
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
            onProfileClick={() => setScreen({ type: 'profile' })}
          />
        )}

        {screen.type === 'create-template' && (
          <CreateWorkoutScreen
            onSave={handleSaveTemplate}
            onDiscard={() => setScreen({ type: 'home' })}
          />
        )}

        {screen.type === 'view-template' && (() => {
          const template = templates.find(t => t.id === screen.templateId);
          if (!template) return null;
          
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
              onStart={() => handleStartTemplate(template.id)}
              onEdit={() => {
                // TODO: Add edit functionality
                setBanner({ message: 'Edit not yet implemented', variant: 'info' });
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
            console.error('Workout not found:', {
              lookingFor: screen.workoutId,
              availableWorkouts: workouts.map(w => ({ id: w.id, name: w.name, isComplete: w.isComplete })),
              workoutsLength: workouts.length
            });
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
              onStartAgain={() => startWorkoutFromHistory(workout.id)}
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
                setScreen({ 
                  type: 'workout-summary', 
                  workoutId, 
                  previousScreen: screen 
                });
              }}
            />
          );
        })()}

        {screen.type === 'history' && (
          <HistoryScreen
            key={`history-${screen.scrollPosition || 0}`}
            workouts={workoutHistory}
            user={user}
            initialSearchQuery={screen.searchQuery}
            initialScrollPosition={screen.scrollPosition}
            onBack={() => setScreen({ type: 'home' })}
            onViewWorkout={(workoutId) => setScreen({ 
              type: 'workout-summary', 
              workoutId, 
              previousScreen: screen 
            })}
            onViewExerciseHistory={(exerciseName) => setScreen({ 
              type: 'exercise-history', 
              exerciseName, 
              previousScreen: screen 
            })}
            onStartWorkout={startWorkoutFromHistory}
            onDeleteWorkouts={deleteWorkouts}
            onProfileClick={() => setScreen({ type: 'profile' })}
            onStateChange={handleHistoryStateChange}
          />
        )}
      </div>

      {/* Bottom nav bar - hide on workout session screen and auth screen */}
      {screen.type !== 'workout-session' && screen.type !== 'auth' && (
        <nav className="fixed bottom-0 left-0 right-0 pb-6 pt-4 px-4 z-50">
          <div className="max-w-md mx-auto">
            {/* Pill toggle container */}
            <div className="relative bg-panel/40 backdrop-blur-xl rounded-full p-1 border border-border-subtle/50 shadow-lg">
              {/* Sliding background indicator */}
              <div 
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-accent/10 backdrop-blur-sm rounded-full transition-transform duration-200 ease-out border border-accent/20"
                style={{
                  transform: (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history') ? 'translateX(100%)' : 'translateX(0)',
                }}
              />
              
              {/* Navigation buttons */}
              <div className="relative grid grid-cols-2">
                <button
                  onClick={() => setScreen({ type: 'home' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    !(screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history') ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-sm font-medium">Train</span>
                </button>
                <button
                  onClick={() => setScreen({ type: 'history' })}
                  className={`py-3 px-6 flex items-center justify-center gap-2 transition-colors rounded-full relative z-10 ${
                    (screen.type === 'history' || screen.type === 'workout-summary' || screen.type === 'exercise-history') ? 'text-accent' : 'text-text-muted'
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
      <Modal
        isOpen={showLogExercise}
        onClose={() => {
          setShowLogExercise(false);
          setExerciseName('');
        }}
        title="Log Exercise"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search exercises..."
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            autoFocus
          />
          
          <div className="max-h-[300px] overflow-y-auto -mx-6 px-6 space-y-1">
            {(() => {
              const exercisesDB = loadExercisesDB();
              const searchResults = searchExercises(exerciseName, exercisesDB);
              const hasMatches = searchResults.length > 0;
              const trimmedName = exerciseName.trim();
              const exactMatch = searchResults.some(name => name.toLowerCase() === trimmedName.toLowerCase());
              const showCreateNew = trimmedName !== '' && !exactMatch;
              
              return (
                <>
                  {hasMatches && searchResults.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleLogExerciseFromModal(name)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors"
                    >
                      <p className="text-text-primary">{name}</p>
                    </button>
                  ))}
                  
                  {showCreateNew && (
                    <>
                      {hasMatches && (
                        <div className="px-4 py-2">
                          <div className="h-px bg-border-subtle"></div>
                        </div>
                      )}
                      <button
                        onClick={() => handleLogExerciseFromModal(trimmedName)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-text-primary mb-0.5">Create new exercise</p>
                          <p className="text-text-muted text-sm">{trimmedName}</p>
                        </div>
                        <span className="text-accent font-medium">Record →</span>
                      </button>
                    </>
                  )}
                  
                  {!hasMatches && !showCreateNew && (
                    <div className="px-4 py-8 text-center text-text-muted">
                      Start typing to search exercises...
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </Modal>

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
      {showSessionConflict && (incompleteExerciseSession || unfinishedWorkout) && (
        <SessionConflictModal
          isOpen={showSessionConflict}
          onClose={() => {
            setShowSessionConflict(false);
            setPendingAction(null);
          }}
          sessionType={incompleteExerciseSession ? 'exercise' : 'workout'}
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