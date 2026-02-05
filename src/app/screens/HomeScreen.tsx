import { useState, useEffect } from 'react';
import { Plus, ListPlus, Play, Database, Trash2, Settings } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Workout, AdHocLoggingSession } from '../types';
import { IncompleteExerciseSession } from '../types';
import { WorkoutTemplate } from '../types/templates';
import { formatTimeAgo } from '../utils/storage';
import { formatElapsed, getElapsedSince } from '../utils/restTimer';
import appIcon from '../../images/icon-192x192.png';
import { seedAllDemoData, resetAndSeed, isDemoDataSeeded } from '../../utils/devSeed';

interface HomeScreenProps {
  unfinishedWorkout: Workout | null;
  incompleteExerciseSession: IncompleteExerciseSession | null;
  adHocSession: AdHocLoggingSession | null;
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
  onResumeAdHocSession: () => void;
  onDiscardWorkout: () => void;
  onDiscardExercise: () => void;
  onDiscardAdHocSession: () => void;
  onOpenSettings: () => void;
}

export function HomeScreen({
  unfinishedWorkout,
  incompleteExerciseSession,
  adHocSession,
  workoutTemplates,
  theme,
  onThemeChange,
  onUnitChange,
  onCreateTemplate,
  onViewTemplate,
  onStartTemplate,
  onQuickStart,
  onLogExercise,
  onResumeWorkout,
  onResumeExercise,
  onResumeAdHocSession,
  onDiscardWorkout,
  onDiscardExercise,
  onDiscardAdHocSession,
  onOpenSettings,
}: HomeScreenProps) {

  // Dev-only: Seed demo data
  const handleSeedData = () => {
    if (import.meta.env.PROD) {
      alert('Seeding is disabled in production');
      return;
    }
    if (confirm('Seed demo data? This will add workouts, templates, and usage stats.')) {
      seedAllDemoData();
      alert('Demo data seeded! Refresh the page to see changes.');
    }
  };

  const handleResetAndSeed = () => {
    if (import.meta.env.PROD) {
      alert('Seeding is disabled in production');
      return;
    }
    if (confirm('Reset and reseed all demo data? This will DELETE all existing workouts and templates.')) {
      resetAndSeed();
      alert('Demo data reset and reseeded! Refresh the page to see changes.');
    }
  };

  // Session-level tick for consistent elapsed time computation
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute elapsed time from session-level lastSetAt
  const getSessionElapsed = (session: Workout | IncompleteExerciseSession | AdHocLoggingSession | null): number | null => {
    if (!session || !session.lastSetAt) return null;
    return getElapsedSince(session.lastSetAt, nowMs);
  };

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
              <p className="text-text-muted" style={{ marginTop: '-10px' }}>Track training without the noise</p>
            </div>
          </div>
          
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-panel transition-colors text-text-muted hover:text-text-primary"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* In Progress section */}
        {(unfinishedWorkout || incompleteExerciseSession || adHocSession) && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">In Progress</h2>
            
            {/* Resume workout card */}
            {unfinishedWorkout && (
              <Card gradient className="border-accent/20" onClick={onResumeWorkout}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{unfinishedWorkout.name}</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-text-muted">
                        {unfinishedWorkout.exercises.length} {unfinishedWorkout.exercises.length === 1 ? 'exercise' : 'exercises'}
                      </p>
                      <p className="text-text-muted">
                        {(() => {
                          const elapsed = getSessionElapsed(unfinishedWorkout);
                          return elapsed !== null ? `Since last set: ${formatElapsed(elapsed)}` : 'Not started';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Discard this workout session? This cannot be undone.')) {
                          onDiscardWorkout();
                        }
                      }}
                      className="p-2 rounded-lg border border-border-subtle hover:bg-surface/50 text-text-muted hover:text-danger hover:border-danger/30 transition-colors"
                      title="Discard workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                </div>
              </Card>
            )}

            {/* Resume exercise session card */}
            {incompleteExerciseSession && (
              <Card gradient className="border-accent/20" onClick={onResumeExercise}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{incompleteExerciseSession.exerciseName}</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-text-muted">
                        {incompleteExerciseSession.sets.length} {incompleteExerciseSession.sets.length === 1 ? 'set' : 'sets'} logged
                      </p>
                      <p className="text-text-muted">
                        {(() => {
                          const elapsed = getSessionElapsed(incompleteExerciseSession);
                          return elapsed !== null ? `Since last set: ${formatElapsed(elapsed)}` : 'Not started';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Discard this exercise session? This cannot be undone.')) {
                          onDiscardExercise();
                        }
                      }}
                      className="p-2 rounded-lg border border-border-subtle hover:bg-surface/50 text-text-muted hover:text-danger hover:border-danger/30 transition-colors"
                      title="Discard exercise session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                </div>
              </Card>
            )}

            {/* Resume ad-hoc logging session card */}
            {adHocSession && (
              <Card gradient className="border-accent/20" onClick={onResumeAdHocSession}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">Logging Session</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-text-muted">
                        {adHocSession.exercises.length} {adHocSession.exercises.length === 1 ? 'exercise' : 'exercises'}
                      </p>
                      <p className="text-text-muted">
                        {(() => {
                          const elapsed = getSessionElapsed(adHocSession);
                          return elapsed !== null ? `Since last set: ${formatElapsed(elapsed)}` : 'Not started';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Discard this logging session? This cannot be undone.')) {
                          onDiscardAdHocSession();
                        }
                      }}
                      className="p-2 rounded-lg border border-border-subtle hover:bg-surface/50 text-text-muted hover:text-danger hover:border-danger/30 transition-colors"
                      title="Discard logging session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onResumeAdHocSession();
                      }}
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Start logging */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">Log</h2>
          <Card onClick={onLogExercise} gradient>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="mb-0.5">Start logging</h3>
              <p className="text-text-muted">Log one or more exercises</p>
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

        {/* Dev-only: Seed demo data buttons */}
        {import.meta.env.DEV && (
          <div className="space-y-3 pt-4 border-t border-border-subtle">
            <h2 className="text-xs uppercase tracking-wide text-text-muted px-1">Dev Tools</h2>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                onClick={handleSeedData}
                className="flex-1 text-xs"
                title="Add demo data without deleting existing data"
              >
                <Database className="w-3 h-3 mr-1 inline" />
                Seed Data
              </Button>
              <Button
                variant="neutral"
                onClick={handleResetAndSeed}
                className="flex-1 text-xs"
                title="Reset all data and reseed"
              >
                <Database className="w-3 h-3 mr-1 inline" />
                Reset & Seed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}