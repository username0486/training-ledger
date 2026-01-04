import { useState, useEffect } from 'react';
import { Plus, Sun, Moon, ListPlus, Play } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Workout } from '../types';
import { IncompleteExerciseSession } from '../types';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';
import appIcon from '../../images/icon-192x192.png';

interface HomeScreenProps {
  unfinishedWorkout: Workout | null;
  incompleteExerciseSession: IncompleteExerciseSession | null;
  workoutTemplates: WorkoutTemplate[];
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onCreateTemplate: () => void;
  onViewTemplate: (templateId: string) => void;
  onStartTemplate: (templateId: string) => void;
  onQuickStart: () => void;
  onLogExercise: () => void;
  onResumeWorkout: () => void;
  onResumeExercise: () => void;
}

export function HomeScreen({
  unfinishedWorkout,
  incompleteExerciseSession,
  workoutTemplates,
  theme,
  onThemeChange,
  onCreateTemplate,
  onViewTemplate,
  onStartTemplate,
  onQuickStart,
  onLogExercise,
  onResumeWorkout,
  onResumeExercise,
}: HomeScreenProps) {
  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

  // Timer state for resume card
  const [restTimerElapsed, setRestTimerElapsed] = useState(0);

  // Update timer every second if there's a running timer
  useEffect(() => {
    if (!incompleteExerciseSession?.restTimerStart) {
      setRestTimerElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - incompleteExerciseSession.restTimerStart!) / 1000);
      setRestTimerElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [incompleteExerciseSession?.restTimerStart]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-5 space-y-6">
        {/* Header with Theme Toggle */}
        <div className="pt-4 pb-2 flex items-start justify-between">
          <div className="flex-1 flex items-start gap-4">
            {/* App Icon */}
            <img 
              src={appIcon} 
              alt="Training Ledger" 
              className="rounded-2xl flex-shrink-0"
              style={{ height: 'calc(1.875rem + 1.25rem + 0.5rem)' }} // text-3xl line-height + mb-2 + subtitle line-height
            />
            
            <div className="flex-1">
              <h1 className="text-3xl mb-2">Training Ledger</h1>
              <p className="text-text-muted">Track training without the noise</p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 -mr-2 rounded-xl hover:bg-panel transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-text-muted" />
            ) : (
              <Sun className="w-5 h-5 text-text-muted" />
            )}
          </button>
        </div>

        {/* In Progress section */}
        {(unfinishedWorkout || incompleteExerciseSession) && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">In Progress</h2>
            
            {/* Resume workout card */}
            {unfinishedWorkout && (
              <Card gradient className="border-accent/20" onClick={onResumeWorkout}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{unfinishedWorkout.name}</h3>
                    <p className="text-text-muted">
                      {unfinishedWorkout.exercises.length} {unfinishedWorkout.exercises.length === 1 ? 'exercise' : 'exercises'} · 
                      Started {formatTimeAgo(unfinishedWorkout.startTime)}
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onResumeWorkout();
                    }}
                  >
                    Resume
                  </Button>
                </div>
              </Card>
            )}

            {/* Resume exercise session card */}
            {incompleteExerciseSession && (
              <Card gradient className="border-accent/20" onClick={onResumeExercise}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{incompleteExerciseSession.exerciseName}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-text-muted">
                        {incompleteExerciseSession.sets.length} {incompleteExerciseSession.sets.length === 1 ? 'set' : 'sets'} logged
                      </p>
                      {restTimerElapsed > 0 && (
                        <>
                          <span className="text-text-muted/40">·</span>
                          <p className="text-text-muted/60 tabular-nums text-sm">
                            {Math.floor(restTimerElapsed / 60)}:{(restTimerElapsed % 60).toString().padStart(2, '0')} rest
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onResumeExercise();
                    }}
                  >
                    Resume
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Log single exercise */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">Log</h2>
          <Card onClick={onLogExercise} gradient>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="mb-0.5">Record exercise</h3>
              <p className="text-text-muted">Single entry without a session</p>
            </div>
          </div>
        </Card>
        </div>

        {/* Workout templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">Saved</h2>
            <button
              onClick={onCreateTemplate}
              className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
            >
              <ListPlus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
          
          {workoutTemplates.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-text-muted mb-4">No saved workouts yet</p>
              <Button variant="neutral" size="sm" onClick={onCreateTemplate}>
                <ListPlus className="w-4 h-4 mr-2 inline" />
                Add Workout
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {workoutTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  gradient 
                  className="group"
                  onClick={() => onViewTemplate(template.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-0.5 truncate">{template.name}</h3>
                      <p className="text-text-muted">
                        {template.exerciseNames.length} {template.exerciseNames.length === 1 ? 'exercise' : 'exercises'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTemplate(template.id);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1.5 inline" />
                      Record
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}