# Exercise Search Familiarity-First: Acceptance Criteria

## Functional Requirements

### 1. Familiarity Ranking
- ✅ **Recent exercises rank first**: When query is empty, show top 15-20 recent exercises, then all others alphabetically
- ✅ **Query affinity works**: If user types "bp" and previously selected "Bench Press" for that query, "Bench Press" appears first
- ✅ **Usage stats boost**: Exercises used more recently rank higher than those used long ago
- ✅ **User-created priority**: User-created exercises rank above system exercises (all else equal)

### 2. Forgiving Search
- ✅ **Typos handled**: Typing "sqaut" still finds "Squat" (edit distance ≤ 3)
- ✅ **Partials work**: Typing "lat" finds "Lat Pulldown", "Lat Raise", etc.
- ✅ **Aliases expand**: "bb" finds "Barbell" exercises, "db" finds "Dumbbell" exercises
- ✅ **Token overlap**: "chest press" matches "Chest Press" even if order differs

### 3. Instant Creation
- ✅ **No confirmation modal**: Clicking "Add '{query}'" creates exercise immediately
- ✅ **Silent deduplication**: Creating "bench press" when "Bench Press" exists selects existing (no error)
- ✅ **Name-only required**: Only exercise name needed, no metadata required
- ✅ **Feels like notebook**: Creation is instant and non-judgmental

### 4. Learning Behavior
- ✅ **Alias learning**: If user types "bp" and selects "Bench Press", "bp" becomes an alias for "Bench Press"
- ✅ **Affinity tracking**: Query→exercise selections are remembered and boost ranking
- ✅ **Usage tracking**: Exercise usage count and last used timestamp are tracked
- ✅ **Auto-aliases**: Common abbreviations (bb, db, kb, etc.) are auto-generated

## Performance Requirements

- ✅ **Fast search**: <100ms for 800 exercises
- ✅ **Offline-first**: All behavior works without network
- ✅ **No blocking**: Search never blocks UI or interrupts training flow

## UX Requirements

- ✅ **No modals/warnings**: No "Did you mean?" dialogs, no confirmation modals
- ✅ **No taxonomy enforcement**: No required metadata, no coaching
- ✅ **Silent operation**: Errors handled gracefully, no user-facing errors
- ✅ **Continuity**: User's previous choices influence future results

## Regression Tests

### Existing Flows Unchanged
- ✅ **Log Exercise**: Search works, creation works, selection works
- ✅ **Create Workout**: Adding exercises to workout works
- ✅ **Workout Session**: Adding exercises during session works
- ✅ **Offline**: All behavior works without network connection

### Data Integrity
- ✅ **Existing exercises**: All 800 system exercises remain searchable
- ✅ **User exercises**: All user-created exercises remain searchable
- ✅ **No data loss**: Existing exercise data unchanged
- ✅ **Backward compatible**: Old search API still works

## Test Scenarios

### Scenario 1: First-Time User
1. Open search → See all exercises alphabetically (no recents yet)
2. Type "squat" → See "Squat" and related exercises
3. Select "Barbell Back Squat"
4. Open search again → "Barbell Back Squat" appears in recents
5. Type "squat" again → "Barbell Back Squat" appears first (usage boost)

### Scenario 2: Familiar User
1. User has used "Bench Press" 10 times, last used 2 days ago
2. User has used "Incline Bench Press" 2 times, last used 30 days ago
3. Type "bench" → "Bench Press" appears before "Incline Bench Press" (recency + frequency)

### Scenario 3: Query Affinity
1. User types "bp" and selects "Bench Press"
2. User types "bp" again → "Bench Press" appears first (affinity boost)
3. User types "bench" → "Bench Press" still appears (text match + affinity)

### Scenario 4: Typo Forgiveness
1. Type "sqaut" → Finds "Squat" (edit distance)
2. Type "latpulldown" → Finds "Lat Pulldown" (alias expansion)
3. Type "chest pres" → Finds "Chest Press" (partial match)

### Scenario 5: Instant Creation
1. Type "my custom exercise"
2. Click "Add 'my custom exercise'" → Exercise created instantly, no modal
3. Exercise appears in list immediately
4. Type "my custom" → New exercise appears in results

### Scenario 6: Silent Deduplication
1. Type "bench press" (system exercise "Bench Press" exists)
2. Click "Add 'bench press'" → Selects existing "Bench Press" (no error, no duplicate)

### Scenario 7: User vs System Priority
1. User created "My Squat Variant"
2. System has "Barbell Back Squat"
3. Type "squat" → "My Squat Variant" appears before "Barbell Back Squat" (user-created boost)

## Performance Benchmarks

- **Search latency**: <100ms for 800 exercises (measured on mid-range device)
- **Memory usage**: <10MB for all search data structures
- **Storage**: <1MB for usage stats, aliases, and affinities

## Edge Cases

- ✅ **Empty query**: Shows recents first, then all exercises
- ✅ **No matches**: Shows "Add '{query}'" button
- ✅ **Corrupted data**: Gracefully handles missing/corrupted localStorage data
- ✅ **Very long query**: Handles queries up to 100 characters
- ✅ **Special characters**: Handles unicode, emojis, special chars in exercise names
- ✅ **Deleted exercises**: Cleanup functions remove orphaned stats/aliases/affinities

