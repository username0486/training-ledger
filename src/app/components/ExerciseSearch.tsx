import { useState, useMemo, useEffect } from 'react';
import { ExerciseSearchInput } from './ExerciseSearchInput';
import { ExerciseList } from './ExerciseList';
import { Button } from './Button';
import { getAllExercisesList, ExerciseDBEntry } from '../utils/exerciseDb';
import { searchExercisesWithIntent } from '../../utils/exerciseDb/intentSearch';
import { recordRecentExercise, getRecentExercisesWithUsage } from '../../utils/exerciseRecents';
import { normalizeExerciseName } from '../../utils/exerciseDb/types';
import { recordAffinity } from '../../utils/exerciseAffinity';
import { recordUsage, getUsageStats, type UsageStats } from '../../utils/exerciseUsageStats';
import { learnAlias, initializeAliasesForExercise } from '../../utils/exerciseAlias';
import { findLikelyReplacements } from '../../utils/exerciseSimilarity';
import { getSwapScore, getReplacementHistory } from '../../utils/exerciseSwapHistory';
import { AnyExercise } from '../../utils/exerciseDb/types';

interface ExerciseSearchProps {
  onSelectExercise: (exerciseName: string) => void;
  onAddNewExercise?: (exerciseName: string) => void;
  selectedExercises?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  showDetails?: boolean;
  createButtonLabel?: string; // e.g., "Create & start" or "Create & add"
  swapContext?: {
    originalExercise: AnyExercise; // The exercise being replaced
  };
}

/**
 * Shared exercise search component used across all search contexts
 * - Log Exercise search
 * - Workout creation search
 * - Workout session "Add exercise" search
 */
export function ExerciseSearch({
  onSelectExercise,
  onAddNewExercise,
  selectedExercises = [],
  placeholder = 'Search exercises...',
  autoFocus = false,
  showDetails = true,
  createButtonLabel = 'Create & start',
  swapContext,
}: ExerciseSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseDBEntry[]>([]);

  // Load all exercises on mount
  useEffect(() => {
    const loadExercises = () => {
      const exercises = getAllExercisesList();
      setAllExercises(exercises);
    };
    
    loadExercises();
    
    // Also reload after a short delay to catch async initialization
    const timeout = setTimeout(loadExercises, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  // Initialize aliases for exercises on load (one-time, idempotent)
  useEffect(() => {
    // Initialize aliases for system exercises (only once)
    allExercises.forEach(ex => {
      if (ex.source === 'system') {
        initializeAliasesForExercise(ex.id, ex.name);
      }
    });
  }, [allExercises.length]); // Only run when exercise count changes

  // Get recent exercises for default state (when query is empty)
  const recentExercises = useMemo(() => {
    if (searchTerm.trim()) return []; // Only show recents when query is empty
    
    return getRecentExercisesWithUsage(
      allExercises,
      5, // Default: 5 items (max 7)
      (exerciseId) => {
        const stats = getUsageStats(exerciseId);
        if (!stats) return null;
        return { useCount: stats.useCount, lastUsedAt: stats.lastUsedAt };
      }
    );
  }, [allExercises, searchTerm]);

  // Search with intent-based two-tier results (Matches + Related)
  // Only search when user has typed something
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return { matches: [], related: [] };
    }
    return searchExercisesWithIntent(allExercises, searchTerm);
  }, [searchTerm, allExercises]);

  // Likely replacements (only shown in swap context when query is empty or minimal)
  const likelyReplacements = useMemo(() => {
    if (!swapContext) return [];
    
    // Only show likely replacements when query is empty or very short (1-2 chars)
    // Once user starts typing, show normal search results
    if (searchTerm.trim().length > 2) return [];
    
    const original = swapContext.originalExercise;
    const allExercisesAny: AnyExercise[] = allExercises;
    
    // Get similarity-based replacements
    const similarityResults = findLikelyReplacements(
      original,
      allExercisesAny,
      [original.id] // Exclude the original exercise
    );
    
    // Boost with swap history
    const replacementHistory = getReplacementHistory(original.id);
    const scored = similarityResults.map(result => {
      const swapScore = getSwapScore(original.id, result.exercise.id);
      const historyCount = replacementHistory.get(result.exercise.id) || 0;
      
      // Combine similarity score with swap history
      // Swap history gets higher weight (user's past choices matter more)
      const totalScore = result.score + (swapScore * 2) + (historyCount * 1.5);
      
      return {
        ...result,
        score: totalScore,
      };
    });
    
    // Re-sort by combined score
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.exercise.name.localeCompare(b.exercise.name);
    });
    
    // Return top 5-8 likely replacements
    return scored.slice(0, 8).map(s => s.exercise);
  }, [swapContext, allExercises, searchTerm]);
  
  // For backward compatibility: combine matches and related for exactMatch check
  const filteredExercises = useMemo(() => {
    return [...searchResults.matches, ...searchResults.related];
  }, [searchResults]);

  // Check if search term exactly matches any exercise name
  const exactMatch = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const trimmed = searchTerm.trim().toLowerCase();
    return allExercises.find(ex => ex.name.toLowerCase() === trimmed) || null;
  }, [allExercises, searchTerm]);

  // Check if we should show "Add as New Exercise" option
  const showAddNew = searchTerm.trim() !== '' && !exactMatch;

  const handleSelectExercise = (exercise: ExerciseDBEntry) => {
    // Record as recent
    recordRecentExercise(exercise);
    
    // Record usage stats
    recordUsage(exercise.id);
    
    // Record query→exercise affinity (if there's a search term)
    if (searchTerm.trim()) {
      recordAffinity(searchTerm, exercise.id);
      
      // Learn alias if query doesn't match exercise name
      const normalizedQuery = normalizeExerciseName(searchTerm);
      const normalizedName = normalizeExerciseName(exercise.name);
      if (normalizedQuery !== normalizedName) {
        learnAlias(searchTerm, exercise.id);
      }
    }
    
    // Call parent handler
    onSelectExercise(exercise.name);
  };

  const handleAddNewExerciseClick = () => {
    const trimmedName = searchTerm.trim();
    if (!trimmedName || !onAddNewExercise) return;

    // Check for duplicate before creating (silent deduplication)
    const normalizedInput = normalizeExerciseName(trimmedName);
    const allExercisesList = getAllExercisesList();
    const existingExercise = allExercisesList.find(
      ex => normalizeExerciseName(ex.name) === normalizedInput
    );

    if (existingExercise) {
      // Silently select existing exercise instead of creating duplicate
      handleSelectExercise(existingExercise);
      return;
    }

    // Create new exercise instantly (no confirmation modal)
    onAddNewExercise(trimmedName);
    
    // Reload exercises to include the new one
    const exercises = getAllExercisesList();
    setAllExercises(exercises);
    
    // Initialize aliases and record usage/affinity for the new exercise
    const newExercise = exercises.find(ex => normalizeExerciseName(ex.name) === normalizedInput);
    if (newExercise) {
      // Initialize common aliases
      initializeAliasesForExercise(newExercise.id, newExercise.name);
      
      // Record usage
      recordUsage(newExercise.id);
      
      // Record affinity if there was a search term
      if (searchTerm.trim()) {
        recordAffinity(searchTerm, newExercise.id);
      }
    }
  };

  // Determine what to show based on query state
  const isEmptyQuery = !searchTerm.trim();
  const hasSearchResults = searchResults.matches.length > 0 || searchResults.related.length > 0;
  const hasRecents = recentExercises.length > 0;

  return (
    <div className="space-y-3">
      {/* Search input - sticky when scrolling */}
      <div className="sticky top-0 z-10 bg-panel pb-3" style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <ExerciseSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </div>

      {/* Content area */}
      {isEmptyQuery ? (
        // DEFAULT STATE: Show likely replacements (swap context) or recent exercises
        swapContext && likelyReplacements.length > 0 ? (
          <>
            <div className="px-4 py-1">
              <p className="text-xs uppercase tracking-wide text-text-muted">Likely replacements</p>
            </div>
            <ExerciseList
              exercises={likelyReplacements}
              onSelect={handleSelectExercise}
              selectedExercises={selectedExercises}
              showDetails={showDetails}
              showSecondaryMuscles={false}
              showCategory={false}
              emptyMessage=""
            />
          </>
        ) : hasRecents ? (
          <div className="overflow-hidden">
            <ExerciseList
              exercises={recentExercises}
              onSelect={handleSelectExercise}
              selectedExercises={selectedExercises}
              showDetails={showDetails}
              showSecondaryMuscles={false}
              showCategory={false}
              emptyMessage=""
            />
          </div>
        ) : (
          // Empty state: no history
          <div className="py-8 text-center text-text-muted">
            <p className="text-sm">Start typing to search exercises</p>
          </div>
        )
      ) : (
        // TYPING STATE: Show search results (scrollable)
        <>
          {hasSearchResults ? (
            <>
              {/* Matches section */}
              {searchResults.matches.length > 0 && (
                <ExerciseList
                  exercises={searchResults.matches}
                  onSelect={handleSelectExercise}
                  selectedExercises={selectedExercises}
                  showDetails={showDetails}
                  showSecondaryMuscles={false}
                  showCategory={false}
                  emptyMessage=""
                />
              )}
              
              {/* Related section (only if matches are empty or weak) */}
              {searchResults.related.length > 0 && (
                <>
                  {searchResults.matches.length > 0 && (
                    <div className="py-2">
                      <div className="h-px bg-border-subtle"></div>
                    </div>
                  )}
                  <div className="px-4 py-1">
                    <p className="text-xs uppercase tracking-wide text-text-muted">Related</p>
                  </div>
                  <ExerciseList
                    exercises={searchResults.related}
                    onSelect={handleSelectExercise}
                    selectedExercises={selectedExercises}
                    showDetails={showDetails}
                    showSecondaryMuscles={false}
                    showCategory={false}
                    emptyMessage=""
                  />
                </>
              )}
              
              {/* Likely replacements section (only in swap context, when query is short) */}
              {swapContext && searchTerm.trim().length <= 2 && likelyReplacements.length > 0 && (
                <>
                  {(searchResults.matches.length > 0 || searchResults.related.length > 0) && (
                    <div className="py-2">
                      <div className="h-px bg-border-subtle"></div>
                    </div>
                  )}
                  <div className="px-4 py-1">
                    <p className="text-xs uppercase tracking-wide text-text-muted">Likely replacements</p>
                  </div>
                  <ExerciseList
                    exercises={likelyReplacements}
                    onSelect={handleSelectExercise}
                    selectedExercises={selectedExercises}
                    showDetails={showDetails}
                    showSecondaryMuscles={false}
                    showCategory={false}
                    emptyMessage=""
                  />
                </>
              )}
              
              {/* Add new exercise option */}
              {!exactMatch && filteredExercises.length > 0 && (
                <>
                  <div className="py-2">
                    <div className="h-px bg-border-subtle"></div>
                  </div>
                  <div className="px-4 py-2">
                    <Button
                      variant="neutral"
                      onClick={handleAddNewExerciseClick}
                      className="w-full"
                    >
                      Add "{searchTerm.trim()}" as New Exercise
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            // NO MATCH: Show create action
            <div className="py-8 text-center space-y-4">
              <div className="text-text-muted">
                <p className="mb-2">No exercises found matching "{searchTerm}"</p>
              </div>
              <Button
                variant="primary"
                onClick={handleAddNewExerciseClick}
                className="mx-auto"
              >
                Create "{searchTerm.trim()}"
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

