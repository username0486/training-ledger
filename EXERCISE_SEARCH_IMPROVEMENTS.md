# Exercise Search Improvements: Familiarity-First Approach

## A) Specific Incremental Changes

### 1. Remove Confirmation Modal (Instant Creation)
- **Current**: User must confirm via modal before creating exercise
- **Change**: Create exercise immediately on "Add as New Exercise" click
- **Rationale**: Reduces friction, feels like writing in a notebook
- **Risk**: Low - duplicate prevention still works via normalization

### 2. Add Query→Exercise Affinity Tracking
- **Current**: No learning from user selections
- **Change**: Store lightweight mapping: `query → exerciseId` when user selects
- **Storage**: New localStorage key `exercise.search.affinity` (Map<string, string[]>)
- **Usage**: Boost ranking for exercises that match previous query patterns
- **Rationale**: If user types "bp" and selects "Bench Press", remember that association

### 3. Prioritize User-Created Exercises
- **Current**: System and user exercises treated equally in ranking
- **Change**: User-created exercises rank higher than system exercises (all else equal)
- **Rationale**: User's own names are more familiar than system taxonomy

### 4. Improve Empty State (No Query)
- **Current**: Shows recents first, then alphabetical
- **Change**: 
  - Show recents more prominently (maybe limit to top 10-15)
  - Add subtle visual distinction for recents vs. all
  - Consider showing "Most used" if available
- **Rationale**: Reduces scanning when user knows what they want

### 5. Relax Exact Match Detection
- **Current**: Only shows "Add as New Exercise" if no exact match
- **Change**: Show creation option even if there's a close match (fuzzy threshold)
- **Rationale**: User might want their own variant even if similar exists

### 6. Boost Recent Exercises in Search Results
- **Current**: Recents only prioritized when query is empty
- **Change**: When query matches, boost recent exercises in ranking
- **Rationale**: If user typed "squat" and recently used "Barbell Back Squat", show it first

### 7. Simplify Search Algorithm
- **Current**: Complex precision/discovery modes exist but aren't used in main search
- **Change**: Use simpler, familiarity-first ranking:
  1. Exact name match (highest)
  2. Recent exercises that match query
  3. User exercises that match query
  4. System exercises that match query
  5. Query affinity matches
  6. Alphabetical tie-breaker
- **Rationale**: Simpler = faster = less cognitive load

## B) Updated Ranking Logic (Pseudo-code)

```typescript
function rankExercises(exercises: AnyExercise[], query: string, recents: string[], affinities: Map<string, string[]>): AnyExercise[] {
  const normalizedQuery = normalizeExerciseName(query);
  const recentSet = new Set(recents);
  
  return exercises
    .map(exercise => {
      let score = 0;
      const normalizedName = normalizeExerciseName(exercise.name);
      const exerciseId = exercise.id;
      
      // 1. Exact match (highest priority)
      if (normalizedName === normalizedQuery) {
        score += 10000;
      }
      // 2. Starts with query
      else if (normalizedName.startsWith(normalizedQuery)) {
        score += 5000;
      }
      // 3. Contains query
      else if (normalizedName.includes(normalizedQuery)) {
        score += 1000;
      }
      // 4. Alias matches
      else if (exercise.aliases?.some(alias => 
        normalizeExerciseName(alias).includes(normalizedQuery)
      )) {
        score += 800;
      }
      // 5. No match - filter out
      else {
        return null;
      }
      
      // Boost: Recent exercises
      if (recentSet.has(exerciseId)) {
        score += 2000;
      }
      
      // Boost: User-created exercises
      if (exercise.source === 'user') {
        score += 1500;
      }
      
      // Boost: Query affinity (if this query was used to select this exercise before)
      const queryAffinities = affinities.get(normalizedQuery) || [];
      if (queryAffinities.includes(exerciseId)) {
        score += 3000;
      }
      
      return { exercise, score };
    })
    .filter((item): item is { exercise: AnyExercise; score: number } => item !== null)
    .sort((a, b) => {
      // Primary: score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary: alphabetical
      return normalizeExerciseName(a.exercise.name).localeCompare(
        normalizeExerciseName(b.exercise.name)
      );
    })
    .map(item => item.exercise);
}
```

**What Changed vs. Before:**
- Added query affinity boosting (+3000)
- Added recent exercise boosting in search (+2000)
- Added user-created exercise boost (+1500)
- Simplified scoring (removed complex precision/discovery logic)
- Removed equipment/muscle matching (too taxonomy-focused)

## C) Updated Behaviors

### Opening Search
- **Before**: Shows all exercises, recents first, then alphabetical
- **After**: 
  - Shows top 15 recent exercises prominently
  - Then shows "All exercises" section (collapsible or scrollable)
  - Visual distinction: recents have subtle highlight or badge
  - No default filters or chips

### Typing
- **Before**: Basic text matching, alphabetical tie-breaker
- **After**:
  - Real-time filtering as user types
  - Results ranked by: exact match → affinity → recent → user-created → system → alphabetical
  - Show top 20-30 results (cap to reduce scrolling)
  - If query matches recent exercise, it appears at top even if not exact match

### No Good Match (Creation Affordance)
- **Before**: Shows "Add as New Exercise" button, opens confirmation modal
- **After**:
  - Show "Add '{query}'" button immediately (no modal)
  - Create exercise instantly on click
  - If normalized name matches existing, silently select existing instead
  - No warnings, no "Did you mean?", no coaching
  - Exercise appears in list immediately

## D) New Fields Needed

### Exercise Model
**No new required fields** - existing structure is sufficient:
- `id` (already exists)
- `name` (already exists)
- `aliases` (already exists, optional)
- `source` (already exists: "user" | "system")

### New Storage (localStorage)
```typescript
// exercise.search.affinity
// Format: { [normalizedQuery: string]: string[] } // array of exercise IDs
// Example: { "bp": ["usr:abc123", "sys:benchpress"], "squat": ["sys:backsquat"] }
```

**Why minimal:**
- Uses existing exercise IDs
- No schema migration needed
- Can be cleared/reset without data loss
- Optional enhancement (search works without it)

## E) Acceptance Criteria

### Behavior Improvements
1. ✅ **Familiarity**: When user types "bp" and previously selected "Bench Press" for that query, "Bench Press" appears first
2. ✅ **Continuity**: Recent exercises appear at top even when query partially matches
3. ✅ **User Preference**: User-created "My Squat Variant" ranks above system "Barbell Back Squat" when both match query
4. ✅ **Instant Creation**: Clicking "Add 'new exercise'" creates immediately, no modal
5. ✅ **Silent Deduplication**: Creating "bench press" when "Bench Press" exists selects existing (no error)

### No Regressions
1. ✅ **Offline**: All behavior works offline (localStorage-based)
2. ✅ **Existing Data**: All existing exercises remain searchable
3. ✅ **Performance**: Search feels instant (<100ms for 1000 exercises)
4. ✅ **Backward Compat**: Existing search flows (log exercise, add to workout) unchanged
5. ✅ **No Breaking Changes**: Exercise model unchanged, only ranking improved

### Cognitive Load Reduction
1. ✅ **Less Thinking**: User doesn't need to remember exact exercise name
2. ✅ **Less Hesitation**: Creation feels safe and instant
3. ✅ **Less Scanning**: Recents and affinities reduce list length user must scan
4. ✅ **No Interruptions**: No modals, warnings, or coaching dialogs

## Implementation Notes

### Affinity Learning
- Store when: User selects an exercise from search results
- Key: Normalized query (what they typed)
- Value: Exercise ID they selected
- Limit: Max 5 exercise IDs per query (prevent bloat)
- Cleanup: Optional - remove affinities for exercises that no longer exist

### Migration Strategy
- Affinity storage is additive (doesn't break without it)
- Can be introduced gradually
- Can be cleared/reset if needed
- No migration needed for existing exercises

### Edge Cases Handled
- Query is empty → show recents (existing behavior)
- Query matches nothing → show creation button (existing behavior)
- Query matches exactly → show match first (existing behavior)
- User creates duplicate → silently select existing (new behavior)
- Affinity data corrupted → ignore, continue with normal search

