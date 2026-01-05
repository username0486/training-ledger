# Exercise Search Familiarity-First Implementation Plan

## Overview
Incremental refactor to make exercise search feel like identity convergence under fatigue. The 800-item system database becomes a ranking aid, not a menu.

## Step-by-Step Implementation (PR-Sized Steps)

### Phase 1: Data Model & Storage (Steps 1-3)
**Goal**: Add minimal storage for usage stats, aliases, and query affinities

#### Step 1: Usage Stats Storage
- Create `src/utils/exerciseUsageStats.ts`
- Store: `exerciseId → { useCount, lastUsedAt, lastUsedInWorkoutTemplateId? }`
- localStorage key: `exercise.usage.stats`
- Functions: `recordUsage()`, `getUsageStats()`, `getUsageScore()`

#### Step 2: Exercise Alias System
- Create `src/utils/exerciseAlias.ts`
- Store: `{ id, exerciseId, alias, normalizedAlias, source, createdAt }[]`
- localStorage key: `exercise.aliases`
- Functions: `addAlias()`, `findAliasesForQuery()`, `expandAliases()`
- Auto-generate aliases from common patterns (e.g., "bb" → "barbell")

#### Step 3: Query Affinity Enhancement
- Enhance existing `src/utils/exerciseAffinity.ts`
- Add `score` field (increment on selection)
- Add `lastChosenAt` timestamp
- Update `recordAffinity()` to increment score

### Phase 2: Normalization & Matching (Steps 4-5)
**Goal**: Fast, forgiving text matching

#### Step 4: Normalization Utilities
- Create `src/utils/searchNormalize.ts`
- Functions: `normalize()`, `tokenize()`, `stringMatchScore()`
- Handle typos with bounded edit distance
- Precompute normalized fields for performance

#### Step 5: Alias Expansion
- Create `src/utils/aliasExpansion.ts`
- Function: `expandAliases(query)` → candidate exerciseIds
- Use normalized matching + token overlap
- Return boosted candidates for ranking

### Phase 3: Ranking Algorithm (Steps 6-7)
**Goal**: Familiarity-first scoring

#### Step 6: Scoring Components
- Create `src/utils/exerciseScoring.ts`
- Functions:
  - `usageScore(exercise, usageStats)` → exponential decay + frequency
  - `contextScore(exercise, templateId)` → template affinity
  - `affinityScore(query, exercise, affinities)` → query→exercise affinity
  - `textScore(query, exercise)` → text matching
- Tuneable weights as constants

#### Step 7: Unified Ranking
- Update `src/utils/exerciseDb/familiaritySearch.ts`
- Integrate all scoring components
- Apply weights: W_usage=0.4, W_context=0.2, W_affinity=0.3, W_text=0.1
- Sort by total score, return ranked list

### Phase 4: Search Behavior (Steps 8-9)
**Goal**: Notebook-like interaction

#### Step 8: Search States
- Update `src/app/components/ExerciseSearch.tsx`
- States:
  - Empty query → show recents (top 15) + "All exercises" section
  - Typing → real-time filtering with familiarity ranking
  - No match → show "Create '{query}'" row (instant, no modal)
- Remove confirmation modal requirement

#### Step 9: Context Awareness
- Pass `contextWorkoutTemplateId` to search when available
- Boost exercises used in that template
- Update `WorkoutSessionScreen` and `CreateWorkoutScreen` to pass context

### Phase 5: Integration & Testing (Steps 10-11)
**Goal**: Ensure no regressions

#### Step 10: Integration Points
- Update all search entry points:
  - `LogExerciseSearch`
  - `CreateWorkoutScreen` exercise search
  - `WorkoutSessionScreen` add exercise
- Ensure usage stats recorded on selection
- Ensure aliases generated for new exercises

#### Step 11: Acceptance Tests
- Test familiarity: recent exercises rank first
- Test forgiveness: typos still find matches
- Test creation: instant, no modal
- Test performance: <100ms for 800 exercises
- Test offline: all behavior works without network

## Data Model Summary

### Storage (localStorage)
```typescript
// exercise.usage.stats
{ [exerciseId: string]: {
  useCount: number;
  lastUsedAt: number; // timestamp
  lastUsedInWorkoutTemplateId?: string;
} }

// exercise.aliases
Array<{
  id: string;
  exerciseId: string;
  alias: string;
  normalizedAlias: string;
  source: 'system' | 'learned' | 'manual';
  createdAt: number;
}>

// exercise.search.affinity (enhanced)
{ [normalizedQuery: string]: Array<{
  exerciseId: string;
  score: number;
  lastChosenAt: number;
}> }
```

### Exercise Model (existing, no changes needed)
- Uses existing `id`, `name`, `source`, `aliases` fields
- No schema migration required

## Ranking Algorithm (Detailed)

```typescript
function rankExercises(
  exercises: Exercise[],
  query: string,
  contextTemplateId?: string
): RankedExercise[] {
  // 1. Normalize query
  const normalizedQuery = normalize(query);
  
  // 2. Get candidates
  const candidates = getCandidates(exercises, normalizedQuery);
  
  // 3. Score each candidate
  const scored = candidates.map(exercise => {
    const usage = getUsageStats(exercise.id);
    const affinities = getAffinities(normalizedQuery);
    const aliases = getAliases(exercise.id);
    
    const score = 
      0.4 * usageScore(usage) +
      0.2 * contextScore(exercise, contextTemplateId) +
      0.3 * affinityScore(normalizedQuery, exercise.id, affinities) +
      0.1 * textScore(normalizedQuery, exercise.name, aliases);
    
    return { exercise, score };
  });
  
  // 4. Sort and return
  return scored
    .sort((a, b) => b.score - a.score)
    .map(item => item.exercise);
}

function usageScore(stats: UsageStats): number {
  if (!stats) return 0;
  
  const daysSince = (Date.now() - stats.lastUsedAt) / (1000 * 60 * 60 * 24);
  const recentBoost = Math.exp(-daysSince / 30); // τ = 30 days
  const freqBoost = Math.log(1 + stats.useCount);
  
  return recentBoost + 0.3 * freqBoost;
}

function contextScore(exercise: Exercise, templateId?: string): number {
  if (!templateId) return 0;
  
  const usage = getUsageStats(exercise.id);
  if (usage?.lastUsedInWorkoutTemplateId === templateId) {
    return 1.0; // Big boost
  }
  return 0;
}

function affinityScore(query: string, exerciseId: string, affinities: Affinity[]): number {
  const affinity = affinities.find(a => a.exerciseId === exerciseId);
  if (!affinity) return 0;
  
  // Clamp score to 0..10, normalize to 0..1
  return Math.min(affinity.score / 10, 1.0);
}

function textScore(query: string, name: string, aliases: string[]): number {
  const normalizedName = normalize(name);
  const normalizedQuery = normalize(query);
  
  // Exact match
  if (normalizedName === normalizedQuery) return 1.0;
  
  // Prefix match
  if (normalizedName.startsWith(normalizedQuery)) return 0.8;
  
  // Token overlap
  const nameTokens = tokenize(normalizedName);
  const queryTokens = tokenize(normalizedQuery);
  const overlap = nameTokens.filter(t => queryTokens.includes(t)).length;
  const tokenScore = overlap / Math.max(nameTokens.length, queryTokens.length);
  
  // Substring match
  const substringScore = normalizedName.includes(normalizedQuery) ? 0.5 : 0;
  
  // Check aliases
  let aliasScore = 0;
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias === normalizedQuery) {
      aliasScore = Math.max(aliasScore, 0.9);
    } else if (normalizedAlias.startsWith(normalizedQuery)) {
      aliasScore = Math.max(aliasScore, 0.7);
    }
  }
  
  return Math.max(tokenScore, substringScore, aliasScore);
}
```

## Acceptance Criteria

### Functional
1. ✅ Empty search shows recents first (top 15), then all exercises
2. ✅ Typing "bp" finds "Bench Press" if user selected it before for that query
3. ✅ Recent exercises rank above system exercises (all else equal)
4. ✅ User-created exercises rank above system exercises
5. ✅ Creating "bench press" when "Bench Press" exists selects existing (silent)
6. ✅ Creating new exercise is instant (no modal)
7. ✅ Typos like "squat" → "sqaut" still find matches
8. ✅ Partial queries like "lat" find "Lat Pulldown"

### Performance
1. ✅ Search completes in <100ms for 800 exercises
2. ✅ Normalization is cached/precomputed
3. ✅ No network requests during search

### UX
1. ✅ No modals, warnings, or "Did you mean?" dialogs
2. ✅ No taxonomy enforcement or required metadata
3. ✅ Creation feels like writing in a notebook
4. ✅ Search is forgiving (accepts typos, partials, synonyms)

### Regression
1. ✅ All existing search flows work unchanged
2. ✅ Offline behavior preserved
3. ✅ Existing exercises remain searchable
4. ✅ No breaking changes to Exercise model

## Testing Strategy

### Unit Tests
- Normalization: `normalize()`, `tokenize()`, `stringMatchScore()`
- Scoring: `usageScore()`, `affinityScore()`, `textScore()`
- Alias expansion: `expandAliases()`

### Integration Tests
- Search with empty query → recents first
- Search with query → familiarity ranking
- Create exercise → instant, no modal
- Select exercise → usage stats updated, affinity recorded

### Manual Testing Checklist
- [ ] Open search → see recents
- [ ] Type "bp" → see "Bench Press" if used before
- [ ] Type "new exercise" → see "Create 'new exercise'" row
- [ ] Click create → exercise created instantly
- [ ] Type typo "sqaut" → still finds "Squat"
- [ ] Create duplicate → silently selects existing
- [ ] Works offline
- [ ] Performance feels instant

