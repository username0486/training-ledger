import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Play, Circle, Check, Trash2, UserCircle, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Workout } from '../types';
import { formatDate, formatTimeAgo } from '../utils/storage';
import { createHistoryIndex, formatBucketLabel, findWorkoutsByExercise, getAvailableTimePeriods, getBucketKey } from '../utils/historyIndex';
import { User } from '../utils/auth';

interface HistoryScreenProps {
  workouts: Workout[];
  user: User | null;
  initialSearchQuery?: string;
  initialScrollPosition?: number;
  onBack: () => void;
  onViewWorkout: (workoutId: string) => void;
  onViewExerciseHistory: (exerciseName: string) => void;
  onStartWorkout: (workoutId: string) => void;
  onDeleteWorkouts: (workoutIds: string[]) => void;
  onProfileClick: () => void;
  onStateChange: (searchQuery: string, scrollPosition: number) => void;
}

export function HistoryScreen({
  workouts,
  user,
  initialSearchQuery = '',
  initialScrollPosition = 0,
  onBack,
  onViewWorkout,
  onViewExerciseHistory,
  onStartWorkout,
  onDeleteWorkouts,
  onProfileClick,
  onStateChange,
}: HistoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filter, setFilter] = useState<'all' | 'workouts' | 'exercises'>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Restore scroll position when initialScrollPosition changes
  useEffect(() => {
    if (scrollContainerRef.current && initialScrollPosition > 0 && !isRestoringScroll.current) {
      isRestoringScroll.current = true;
      
      // Use double requestAnimationFrame to ensure content is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollPosition;
            // Reset flag after a short delay
            setTimeout(() => {
              isRestoringScroll.current = false;
            }, 100);
          }
        });
      });
    }
  }, [initialScrollPosition]);

  // Update parent state when any state changes (but not during scroll restoration)
  useEffect(() => {
    if (!isRestoringScroll.current) {
      const scrollPosition = scrollContainerRef.current?.scrollTop || 0;
      onStateChange(searchQuery, scrollPosition);
    }
  }, [searchQuery, onStateChange]);

  // Capture scroll position before navigating away
  const captureScrollPosition = () => {
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;
    onStateChange(searchQuery, scrollPosition);
  };

  // Filter workouts based on filter type
  const filteredWorkouts = useMemo(() => {
    if (filter === 'all') {
      return workouts;
    } else if (filter === 'workouts') {
      // Exclude single exercises
      return workouts.filter(w => {
        const isSingleExercise = w.exercises.length === 1 && w.name === w.exercises[0]?.name;
        return !isSingleExercise;
      });
    } else {
      // Only single exercises
      return workouts.filter(w => {
        const isSingleExercise = w.exercises.length === 1 && w.name === w.exercises[0]?.name;
        return isSingleExercise;
      });
    }
  }, [workouts, filter]);

  // Create time-bucketed history index with filtered workouts
  const historyIndex = useMemo(() => {
    return createHistoryIndex(filteredWorkouts);
  }, [filteredWorkouts]);

  // Initialize expanded buckets with defaults from historyIndex when filter or buckets change
  useEffect(() => {
    const defaultExpanded = new Set<string>();
    historyIndex.buckets.forEach(bucket => {
      if (bucket.isExpanded) {
        defaultExpanded.add(getBucketKey(bucket.bucket));
      }
    });
    setExpandedBuckets(defaultExpanded);
  }, [historyIndex.buckets, filter]);

  // Toggle bucket expansion
  const toggleBucket = (bucketKey: string) => {
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucketKey)) {
        next.delete(bucketKey);
      } else {
        next.add(bucketKey);
      }
      return next;
    });
  };

  // Get visible workouts (from expanded buckets, filtered by search)
  const visibleWorkouts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const visible: Workout[] = [];

    historyIndex.buckets.forEach(bucket => {
      const bucketKey = getBucketKey(bucket.bucket);
      const isExpanded = expandedBuckets.has(bucketKey);

      if (isExpanded) {
        bucket.workouts.forEach(workout => {
          if (searchQuery === '' || workout.name.toLowerCase().includes(searchLower)) {
            visible.push(workout);
          }
        });
      }
    });

    return visible;
  }, [historyIndex.buckets, expandedBuckets, searchQuery]);

  // Exercise-driven lookup: find workouts by exercise name when searching
  const exerciseLookupResults = useMemo(() => {
    if (searchQuery.trim() === '') {
      return [];
    }
    return findWorkoutsByExercise(filteredWorkouts, searchQuery);
  }, [filteredWorkouts, searchQuery]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = () => {
    onDeleteWorkouts(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
    setShowDeleteModal(false);
  };

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      {selectMode && (
        <TopBar
          title={`${selectedIds.size} selected`}
          onBack={handleCancelSelect}
          rightAction={
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedIds.size === 0}
            >
              Delete
            </Button>
          }
        />
      )}

      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-2xl mx-auto p-5 space-y-4">
          {/* Header */}
          {!selectMode && (
            <div className="pt-4 pb-2 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl mb-2">History</h1>
              </div>
              
              {/* Profile Icon */}
              {user && (
                <button
                  onClick={onProfileClick}
                  className="flex items-center gap-2 p-2 -mr-2 rounded-xl hover:bg-panel transition-colors group"
                  aria-label="Open profile"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center group-hover:border-accent/40 transition-colors">
                    <UserCircle className="w-6 h-6 text-accent" />
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Search and Time Navigation - constrained width */}
          {!selectMode && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="search"
                    placeholder="Search workouts and exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowTimePicker(true)}
                  className="px-4 py-2 rounded-lg border border-border-medium bg-surface hover:bg-surface-secondary transition-colors flex items-center gap-2"
                  title="Jump to date"
                >
                  <Calendar className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted hover:bg-surface-secondary'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('workouts')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === 'workouts'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted hover:bg-surface-secondary'
                  }`}
                >
                  Workouts
                </button>
                <button
                  onClick={() => setFilter('exercises')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === 'exercises'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted hover:bg-surface-secondary'
                  }`}
                >
                  Exercises
                </button>
              </div>
            </div>
          )}

          {/* Unified History View */}
          {searchQuery.trim() !== '' && exerciseLookupResults.length > 0 ? (
            // Exercise search results: show workouts containing the exercise
            <div className="divide-y divide-border-subtle">
              {exerciseLookupResults.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center gap-4 py-4 hover:bg-panel/50 transition-colors"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      captureScrollPosition();
                      onViewWorkout(workout.id);
                    }}
                  >
                    <h3 className="mb-1">{workout.name}</h3>
                    <p className="text-text-muted text-sm">
                      {formatDate(workout.endTime || workout.startTime)} · {formatTimeAgo(workout.endTime || workout.startTime)} · {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </div>
                  <button
                    onClick={() => onStartWorkout(workout.id)}
                    className="p-2 rounded-lg hover:bg-accent-muted text-accent transition-colors flex-shrink-0"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Time-bucketed view: show filtered workouts and exercises
            <div>
              {historyIndex.buckets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">
                    {searchQuery ? 'No workouts found' : 'No workouts yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {historyIndex.buckets.map((bucketWrapper) => {
                    const bucketKey = getBucketKey(bucketWrapper.bucket);
                    const isExpanded = expandedBuckets.has(bucketKey);
                    const bucketWorkouts = searchQuery.trim() === ''
                      ? bucketWrapper.workouts
                      : bucketWrapper.workouts.filter(w => 
                          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.exercises.some(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        );

                    if (bucketWorkouts.length === 0) return null;

                    return (
                      <div key={bucketKey} data-bucket-key={bucketKey} className="border-b border-border-subtle last:border-b-0">
                        {/* Bucket Header */}
                        <button
                          onClick={() => toggleBucket(bucketKey)}
                          className="w-full flex items-center justify-between py-3 px-1 hover:bg-panel/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-text-muted" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-text-muted" />
                            )}
                            <span className="text-sm font-medium text-text-muted">
                              {formatBucketLabel(bucketWrapper.bucket)}
                            </span>
                            <span className="text-xs text-text-muted/60">
                              ({bucketWorkouts.length})
                            </span>
                          </div>
                        </button>

                        {/* Bucket Workouts and Exercises */}
                        {isExpanded && (
                          <div className="divide-y divide-border-subtle">
                            {bucketWorkouts.map((workout) => {
                              const isSingleExercise = workout.exercises.length === 1 && workout.name === workout.exercises[0]?.name;
                              
                              return (
                                <div
                                  key={workout.id}
                                  className="flex items-center gap-4 py-4 pl-6 hover:bg-panel/50 transition-colors"
                                >
                                  {selectMode && (
                                    <button
                                      onClick={() => handleToggleSelect(workout.id)}
                                      className="flex-shrink-0"
                                    >
                                      {selectedIds.has(workout.id) ? (
                                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                                          <Check className="w-4 h-4 text-white" />
                                        </div>
                                      ) : (
                                        <Circle className="w-6 h-6 text-border-medium" />
                                      )}
                                    </button>
                                  )}

                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                      if (!selectMode) {
                                        captureScrollPosition();
                                        onViewWorkout(workout.id);
                                      }
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setSelectMode(true);
                                      handleToggleSelect(workout.id);
                                    }}
                                  >
                                    <h3 className="mb-1 truncate">{workout.name}</h3>
                                    <p className="text-text-muted text-sm">
                                      {formatDate(workout.endTime || workout.startTime)} · {formatTimeAgo(workout.endTime || workout.startTime)} · {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                                    </p>
                                  </div>

                                  {!selectMode && (
                                    <button
                                      onClick={() => onStartWorkout(workout.id)}
                                      className="p-2 rounded-lg hover:bg-accent-muted text-accent transition-colors flex-shrink-0"
                                    >
                                      <Play className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete workouts"
        actions={
          <>
            <Button variant="neutral" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </>
        }
      >
        <p className="text-text-muted">
          Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'workout' : 'workouts'}? This cannot be undone.
        </p>
      </Modal>

      {/* Time Navigation Modal */}
      <Modal
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title="Jump to month"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {getAvailableTimePeriods(filteredWorkouts).map(({ year, month }) => {
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const bucketKey = `month-${year}-${month}`;
            const isExpanded = expandedBuckets.has(bucketKey);
            const monthBucket = historyIndex.buckets.find(b => getBucketKey(b.bucket) === bucketKey);

            return (
              <button
                key={`${year}-${month}`}
                onClick={() => {
                  if (!isExpanded) {
                    toggleBucket(bucketKey);
                  }
                  setShowTimePicker(false);
                  // Scroll to bucket after a short delay
                  setTimeout(() => {
                    const element = document.querySelector(`[data-bucket-key="${bucketKey}"]`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-surface transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {monthNames[month]} {year}
                    </p>
                    {monthBucket && (
                      <p className="text-sm text-text-muted">
                        {monthBucket.workouts.length} {monthBucket.workouts.length === 1 ? 'workout' : 'workouts'}
                      </p>
                    )}
                  </div>
                  {isExpanded && (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

    </div>
  );
}