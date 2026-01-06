import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Play, Circle, Check, Trash2, ChevronDown, ChevronRight, Calendar, MoreVertical, Settings, Square, CheckSquare2, ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Workout } from '../types';
import { formatDate, formatTimeAgo } from '../utils/storage';
import { createHistoryIndex, formatBucketLabel, findWorkoutsByExercise, getAvailableTimePeriods, getBucketKey } from '../utils/historyIndex';

/**
 * Determine if a workout entry is a single exercise (exercise-only) entry.
 * 
 * Rule: A workout is considered "exercise-only" if:
 * - It has exactly one exercise
 * - The workout name matches the exercise name
 * 
 * This identifies standalone exercise logs vs. multi-exercise workout sessions.
 */
export function isExerciseOnlyEntry(workout: Workout): boolean {
  return workout.exercises.length === 1 && workout.name === workout.exercises[0]?.name;
}

interface HistoryScreenProps {
  workouts: Workout[];
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  initialSearchQuery?: string;
  initialScrollPosition?: number;
  onBack: () => void;
  onViewWorkout: (workoutId: string) => void;
  onViewExerciseHistory: (exerciseName: string) => void;
  onStartWorkout: (workoutId: string) => void;
  onStartExercise?: (exerciseName: string) => void;
  onDeleteWorkouts: (workoutIds: string[]) => void;
  onStateChange: (searchQuery: string, scrollPosition: number) => void;
  onOpenSettings: () => void;
}

export function HistoryScreen({
  workouts,
  theme,
  onThemeChange,
  onUnitChange,
  initialSearchQuery = '',
  initialScrollPosition = 0,
  onBack,
  onViewWorkout,
  onViewExerciseHistory,
  onStartWorkout,
  onStartExercise,
  onDeleteWorkouts,
  onStateChange,
  onOpenSettings,
}: HistoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filter, setFilter] = useState<'all' | 'workouts' | 'exercises'>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [modalSelectedYear, setModalSelectedYear] = useState<number | null>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
    };

    if (showYearDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showYearDropdown]);

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

  // Get available years from workouts
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    workouts.filter(w => w.isComplete).forEach(workout => {
      const date = new Date(workout.endTime || workout.startTime);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [workouts]);

  const hasMultipleYears = availableYears.length > 1;
  const currentYear = selectedMonth?.year || availableYears[0] || new Date().getFullYear();

  // Compute available months by year (for modal)
  const availableMonthsByYear = useMemo(() => {
    const monthsByYear = new Map<number, Set<number>>();
    workouts.filter(w => w.isComplete).forEach(workout => {
      const date = new Date(workout.endTime || workout.startTime);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!monthsByYear.has(year)) {
        monthsByYear.set(year, new Set());
      }
      monthsByYear.get(year)!.add(month);
    });
    return monthsByYear;
  }, [workouts]);

  // Get modal year (use modalSelectedYear if set, otherwise default to most recent year)
  const modalYear = modalSelectedYear ?? availableYears[0] ?? new Date().getFullYear();

  // Initialize modal year when opened
  useEffect(() => {
    if (showTimePicker && modalSelectedYear === null) {
      setModalSelectedYear(availableYears[0] || new Date().getFullYear());
    }
  }, [showTimePicker, availableYears, modalSelectedYear]);

  // Filter workouts based on filter type and month/year
  const filteredWorkouts = useMemo(() => {
    let result = workouts;
    
    // Apply type filter
    if (filter === 'workouts') {
      result = result.filter(w => !isExerciseOnlyEntry(w));
    } else if (filter === 'exercises') {
      result = result.filter(w => isExerciseOnlyEntry(w));
    }
    
    // Apply month/year filter
    if (selectedMonth) {
      result = result.filter(workout => {
        const date = new Date(workout.endTime || workout.startTime);
        return date.getFullYear() === selectedMonth.year && date.getMonth() === selectedMonth.month;
      });
    }
    
    return result;
  }, [workouts, filter, selectedMonth]);

  // Create time-bucketed history index with filtered workouts
  const historyIndex = useMemo(() => {
    return createHistoryIndex(filteredWorkouts);
  }, [filteredWorkouts]);

  // Initialize expanded buckets with defaults from historyIndex when filter or buckets change
  // Preserve manually expanded buckets (e.g., from jump to date)
  useEffect(() => {
    const defaultExpanded = new Set<string>();
    historyIndex.buckets.forEach(bucket => {
      if (bucket.isExpanded) {
        defaultExpanded.add(getBucketKey(bucket.bucket));
      }
    });
    
    // Preserve any manually expanded buckets that still exist in the new historyIndex
    setExpandedBuckets(prev => {
      const preserved = new Set(defaultExpanded);
      prev.forEach(bucketKey => {
        // Only preserve if this bucket still exists in the current historyIndex
        if (historyIndex.buckets.some(b => getBucketKey(b.bucket) === bucketKey)) {
          preserved.add(bucketKey);
        }
      });
      return preserved;
    });
  }, [historyIndex.buckets, filter]);
  
  // When selectedMonth changes, ensure the corresponding bucket is expanded
  useEffect(() => {
    if (selectedMonth) {
      const bucketKey = `month-${selectedMonth.year}-${selectedMonth.month}`;
      setExpandedBuckets(prev => {
        if (prev.has(bucketKey)) {
          return prev; // Already expanded
        }
        const next = new Set(prev);
        next.add(bucketKey);
        return next;
      });
    }
  }, [selectedMonth]);

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

  // Get all visible workout IDs based on current filters
  const visibleWorkoutIds = useMemo(() => {
    const allVisibleIds = new Set<string>();
    const searchLower = searchQuery.toLowerCase();
    
    filteredWorkouts.forEach(workout => {
      // Check if it matches search query if search is active
      if (searchQuery.trim() === '' || 
          workout.name.toLowerCase().includes(searchLower) ||
          workout.exercises.some(ex => ex.name.toLowerCase().includes(searchLower))) {
        allVisibleIds.add(workout.id);
      }
    });
    
    return allVisibleIds;
  }, [filteredWorkouts, searchQuery]);

  const allVisibleSelected = useMemo(() => {
    return visibleWorkoutIds.size > 0 && Array.from(visibleWorkoutIds).every(id => selectedIds.has(id));
  }, [visibleWorkoutIds, selectedIds]);

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible items
      const newSelected = new Set(selectedIds);
      visibleWorkoutIds.forEach(id => newSelected.delete(id));
      setSelectedIds(newSelected);
    } else {
      // Select all visible items
      const newSelected = new Set(selectedIds);
      visibleWorkoutIds.forEach(id => newSelected.add(id));
      setSelectedIds(newSelected);
    }
  };

  // Clear selection when filter, search, or month filter changes (keep selection mode but clear selection)
  useEffect(() => {
    if (selectMode) {
      setSelectedIds(new Set());
    }
  }, [filter, searchQuery, selectedMonth]);

  return (
    <div className="flex flex-col h-full">
      {selectMode && (
        <TopBar
          title={`${selectedIds.size} selected`}
          onBack={handleCancelSelect}
          rightAction={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="neutral"
                onClick={handleSelectAll}
                disabled={visibleWorkoutIds.size === 0}
              >
                {allVisibleSelected ? 'Deselect all' : 'Select all'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={selectedIds.size === 0}
              >
                Delete
              </Button>
            </div>
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
              
              <div className="flex items-center gap-2">
                {/* Select button */}
                <button
                  onClick={() => setSelectMode(true)}
                  className="p-2 rounded-xl hover:bg-panel transition-colors text-text-muted hover:text-text-primary"
                  title="Select items"
                >
                  <CheckSquare2 className="w-5 h-5" />
                </button>
                
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
                  Exercise only
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
                  {(() => {
                    const isExerciseOnly = isExerciseOnlyEntry(workout);
                    return (
                      <button
                        onClick={() => {
                          if (isExerciseOnly && onStartExercise) {
                            onStartExercise(workout.exercises[0].name);
                          } else {
                            onStartWorkout(workout.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-accent-muted text-accent transition-colors flex-shrink-0"
                        title={isExerciseOnly ? "Repeat exercise" : "Repeat workout"}
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            // Time-bucketed view: show filtered workouts and exercises
            <div>
              {historyIndex.buckets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">
                    {searchQuery 
                      ? 'No workouts found' 
                      : filter === 'exercises' 
                        ? 'No single exercises logged yet' 
                        : 'No workouts yet'}
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
                                  className={`flex items-center gap-4 py-4 pl-6 hover:bg-panel/50 transition-colors ${
                                    selectMode ? 'cursor-pointer' : ''
                                  }`}
                                  onClick={() => {
                                    if (selectMode) {
                                      handleToggleSelect(workout.id);
                                    } else {
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
                                  {selectMode && (
                                    <div className="flex-shrink-0">
                                      {selectedIds.has(workout.id) ? (
                                        <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center border border-accent">
                                          <Check className="w-4 h-4 text-white" />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-md border-2 border-border-medium flex items-center justify-center bg-transparent" />
                                      )}
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <h3 className="mb-1 truncate">{workout.name}</h3>
                                    <p className="text-text-muted text-sm">
                                      {formatDate(workout.endTime || workout.startTime)} · {formatTimeAgo(workout.endTime || workout.startTime)} · {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                                    </p>
                                  </div>

                                  {!selectMode && (() => {
                                    const isExerciseOnly = isExerciseOnlyEntry(workout);
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isExerciseOnly && onStartExercise) {
                                            onStartExercise(workout.exercises[0].name);
                                          } else {
                                            onStartWorkout(workout.id);
                                          }
                                        }}
                                        className="p-2 rounded-lg border border-border-medium hover:bg-panel text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                                        title={isExerciseOnly ? "Repeat exercise" : "Repeat workout"}
                                      >
                                        <Play className="w-5 h-5" />
                                      </button>
                                    );
                                  })()}
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
        title="Delete selected?"
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
          This will delete {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'}.
        </p>
      </Modal>

      {/* Time Navigation Modal */}
      <Modal
        isOpen={showTimePicker}
        onClose={() => {
          setShowTimePicker(false);
          setModalSelectedYear(null);
          setShowYearDropdown(false);
        }}
        title="Jump to date"
      >
        <div className="space-y-4">
          {/* Year Controls (only if multiple years) */}
          {hasMultipleYears && (
            <div className="relative flex items-center justify-center gap-2" ref={yearDropdownRef}>
              <button
                onClick={() => {
                  // availableYears is sorted descending (most recent first)
                  // Left arrow = past = smaller year = higher index in descending array
                  const currentIndex = availableYears.indexOf(modalYear);
                  if (currentIndex < availableYears.length - 1) {
                    setModalSelectedYear(availableYears[currentIndex + 1]);
                  }
                }}
                disabled={availableYears.indexOf(modalYear) >= availableYears.length - 1}
                className="p-1.5 rounded-lg border border-border-medium hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowYearDropdown(!showYearDropdown)}
                  className="px-4 py-1.5 rounded-lg border border-border-medium bg-surface hover:bg-surface-secondary transition-colors text-sm font-medium"
                >
                  {modalYear}
                </button>
                {showYearDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-surface border border-border-medium rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 min-w-[100px]">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setModalSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-secondary transition-colors ${
                          year === modalYear ? 'bg-accent/10 text-accent font-medium' : ''
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  // availableYears is sorted descending (most recent first)
                  // Right arrow = future = larger year = lower index in descending array
                  const currentIndex = availableYears.indexOf(modalYear);
                  if (currentIndex > 0) {
                    setModalSelectedYear(availableYears[currentIndex - 1]);
                  }
                }}
                disabled={availableYears.indexOf(modalYear) <= 0}
                className="p-1.5 rounded-lg border border-border-medium hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthLabel, monthIndex) => {
              const availableMonths = availableMonthsByYear.get(modalYear) || new Set<number>();
              const hasData = availableMonths.has(monthIndex);
              const isSelected = selectedMonth?.year === modalYear && selectedMonth?.month === monthIndex;
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];

              return (
                <button
                  key={monthIndex}
                  onClick={() => {
                    if (hasData) {
                      const bucketKey = `month-${modalYear}-${monthIndex}`;
                      // Ensure the selected month bucket is expanded
                      setExpandedBuckets(prev => {
                        const next = new Set(prev);
                        next.add(bucketKey);
                        return next;
                      });
                      setSelectedMonth({ year: modalYear, month: monthIndex });
                      setShowTimePicker(false);
                      setModalSelectedYear(null);
                      setShowYearDropdown(false);
                      // Scroll to the bucket after a short delay
                      setTimeout(() => {
                        const element = document.querySelector(`[data-bucket-key="${bucketKey}"]`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }
                  }}
                  disabled={!hasData}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent text-white'
                      : hasData
                      ? 'bg-surface text-text-muted hover:bg-surface-secondary'
                      : 'bg-surface/30 text-text-muted/40 cursor-not-allowed opacity-50'
                  }`}
                  aria-label={hasData ? `${monthNames[monthIndex]} ${modalYear}` : `${monthNames[monthIndex]} ${modalYear} (no data)`}
                  aria-disabled={!hasData}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>

          {selectedMonth && (
            <button
              onClick={() => {
                setSelectedMonth(null);
                setShowTimePicker(false);
                setModalSelectedYear(null);
                setShowYearDropdown(false);
              }}
              className="w-full text-sm text-text-muted hover:text-text-primary transition-colors py-2"
            >
              Clear filter
            </button>
          )}
        </div>
      </Modal>

    </div>
  );
}