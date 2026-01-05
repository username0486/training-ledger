# Training Ledger - Progression Algorithm

## Overview
This document defines the progression logic for Training Ledger, designed to guide users through progressive overload with minimal cognitive load. The system automatically suggests weights, reps, and workout structure based on logged performance.

---

## Core Principles

1. **Working Weight Identification**: For each exercise session, identify the "working weight" - the heaviest weight used for the majority of sets
2. **Conservative Progression**: Default to holding current weight unless clear evidence supports increase/decrease
3. **Pattern Recognition**: Analyze trends across multiple sessions, not just the last one
4. **Graceful Degradation**: Handle missing data, skipped exercises, and incomplete sessions

---

## Part 1: Exercise Progression Logic

### Step 1: Extract Working Weight from a Session

**Purpose**: Identify the primary weight used in a session to track progression.

**Algorithm**:
1. Group all sets by weight
2. Find the heaviest weight that was used for at least 2 sets (or 1 set if only 1 set total)
3. Calculate average reps for sets at that weight
4. Return: `{ weight: number, avgReps: number }`

**Example**:
```
Session sets: [60kg×10, 60kg×10, 60kg×9, 55kg×12]
Working weight: 60kg (used 3 times)
Average reps: 9.7 (rounded to 10)
Result: { weight: 60, avgReps: 10 }
```

### Step 2: Get Recent Exercise History

**Purpose**: Retrieve the last N sessions for an exercise to analyze trends.

**Algorithm**:
1. Find all workouts containing the exercise
2. Sort by date (most recent first)
3. Extract working weight and avgReps for each session
4. Return: Array of `{ weight, avgReps, date }` (last 5 sessions)

### Step 3: Determine Progression Action

**Purpose**: Decide whether to increase, hold, decrease, or start fresh.

**Decision Tree**:

#### A. No History (First Time)
- **Condition**: No previous sessions found
- **Action**: `start`
- **Suggestion**: 
  - Weight: Default starting weight (e.g., 20kg for most exercises)
  - Reps: 8-10 reps
  - Rationale: "Starting weight"

#### B. Regression Detection (Decrease)
- **Condition**: 
  - Last 2 sessions at same weight
  - Both sessions performed below historical average at that weight (by 1+ reps)
- **Action**: `decrease`
- **Suggestion**:
  - Weight: Last weight - 2.5kg (minimum: default weight)
  - Reps: Historical average reps at that weight
  - Rationale: "Struggled at this weight - try lighter"

**Example**:
```
History at 60kg: [10, 10, 10, 10] (avg: 10)
Last 2 sessions: [8, 7] (both below 9)
→ Decrease to 57.5kg, suggest 10 reps
```

#### C. Progression Ready (Increase)
- **Condition**:
  - 2+ sessions at current weight
  - Recent sessions stable or improving (within 0.5 reps of average)
  - Last session reps ≥ average
- **Action**: `increase`
- **Suggestion**:
  - Weight: Last weight + 2.5kg
  - Reps: Last session's reps
  - Rationale: "All sets completed at [weight] kg"

**Example**:
```
Sessions at 60kg: [10, 10, 10, 9] (avg: 9.75)
Last 2: [10, 10] (stable, ≥ average)
→ Increase to 62.5kg, suggest 10 reps
```

#### D. Recent Increase (Hold)
- **Condition**:
  - Last session weight > previous session weight
  - Last session reps ≥ 6 (reasonable performance)
- **Action**: `hold`
- **Suggestion**:
  - Weight: Last weight (same)
  - Reps: Last session's reps
  - Rationale: "Match or beat your last performance"

**Example**:
```
Previous: 60kg × 10 reps
Last: 62.5kg × 8 reps (successful increase)
→ Hold at 62.5kg, suggest 8 reps
```

#### E. Default (Hold)
- **Condition**: None of the above
- **Action**: `hold`
- **Suggestion**:
  - Weight: Last working weight
  - Reps: Last average reps
  - Rationale: "Match or beat your last performance"

### Step 4: Generate Suggestions

**Purpose**: Present progression options to the user.

**Algorithm**:
1. Calculate progression action (Step 3)
2. If action is `increase`:
   - Primary suggestion: Increased weight
   - Secondary suggestion: Hold at current weight (safety option)
3. If action is `hold` or `decrease`:
   - Single suggestion: Calculated weight/reps
4. If action is `start`:
   - Single suggestion: Default starting weight/reps

**Display Format**:
- Show as clickable pills/buttons
- Primary suggestion: Bold or highlighted
- Secondary: Subtle styling

---

## Part 2: Workout Progression Logic

### Step 1: Analyze Workout Completion

**Purpose**: Determine which exercises were completed, skipped, or partially done.

**Algorithm**:
1. For each exercise in the workout:
   - If `isComplete === true`: Mark as "completed"
   - If `sets.length === 0`: Mark as "skipped"
   - If `sets.length > 0 && !isComplete`: Mark as "partial"
2. Calculate completion rate: `completed / total exercises`

### Step 2: Suggest Next Workout Structure

**Purpose**: Recommend which exercises to include in the next workout.

**Algorithm**:

#### A. Completed Exercises
- **Action**: Include in next workout
- **Progression**: Use exercise-level progression logic (Part 1)
- **Rationale**: User successfully completed, ready to progress

#### B. Partially Completed Exercises
- **Action**: Include in next workout
- **Progression**: 
  - If sets logged: Use last logged weight/reps as baseline
  - If no sets: Use last full session's working weight
- **Rationale**: User started but didn't finish, continue from where they left off

#### C. Skipped Exercises
- **Action**: Include in next workout (give another chance)
- **Progression**: Use last full session's working weight
- **Rationale**: User may have skipped due to time/energy, not difficulty

#### D. New Exercises
- **Action**: Include if part of workout template
- **Progression**: Use default starting weight (Part 1, Step 3A)
- **Rationale**: New exercise, start conservatively

### Step 3: Workout-Level Metrics

**Purpose**: Track cumulative performance to inform progression.

**Metrics to Calculate**:
1. **Total Volume**: Sum of (weight × reps) for all sets in workout
2. **Average Intensity**: Average weight across all exercises
3. **Completion Rate**: Percentage of exercises completed
4. **Workout Duration**: Time from start to finish

**Usage**:
- Display in workout summary
- Track trends over time
- Not used for progression logic (exercise-level is primary)

---

## Part 3: Edge Cases

### Case 1: First-Time Exercise

**Scenario**: User logs an exercise they've never done before.

**Handling**:
1. Check exercise history: If empty → first time
2. Use default starting weight based on exercise type:
   - Upper body (bench, press): 20kg
   - Lower body (squat, deadlift): 40kg
   - Isolation (curl, extension): 10kg
3. Suggest 8-10 reps
4. Rationale: "Starting weight"

**Implementation Note**: Store exercise categories or use exercise name patterns to determine default weight.

### Case 2: Missed Workouts

**Scenario**: User hasn't logged this exercise in 2+ weeks.

**Handling**:
1. Check time since last session
2. If > 14 days:
   - Suggest: Last weight - 5kg (or 10% reduction)
   - Rationale: "Reduced load after break"
3. If > 30 days:
   - Suggest: Last weight - 10kg (or 20% reduction)
   - Rationale: "Significant break - start lighter"

**Example**:
```
Last session: 60kg × 10 reps, 21 days ago
→ Suggest: 55kg × 10 reps
```

### Case 3: Exercise Substitutions

**Scenario**: User logs "Dumbbell Press" instead of "Barbell Press".

**Handling**:
1. Treat as separate exercise (different name = different progression)
2. Use first-time exercise logic (Case 1)
3. **Future Enhancement**: Could detect similar exercises and suggest weight conversion

**Example**:
```
History: "Barbell Bench Press" - 80kg × 8
User logs: "Dumbbell Bench Press"
→ Treat as new exercise, suggest 20kg (default)
```

### Case 4: Incomplete Sets

**Scenario**: User logs 2 sets but intended to do 3.

**Handling**:
1. Use only logged sets for working weight calculation
2. Don't penalize for incomplete sets
3. Next session: Suggest same weight/reps (hold action)
4. Rationale: "Match your last performance"

**Example**:
```
Last session: 60kg × 10, 60kg × 10 (only 2 sets logged)
Working weight: 60kg, avgReps: 10
Next session: Suggest 60kg × 10 (hold)
```

### Case 5: Inconsistent Set Patterns

**Scenario**: User logs varied weights/reps (e.g., 60×10, 55×12, 60×8).

**Handling**:
1. Use working weight algorithm (Part 1, Step 1)
2. Identifies heaviest weight used for majority of sets
3. If no clear pattern: Use heaviest weight used
4. Average reps for sets at that weight

**Example**:
```
Sets: [60×10, 60×10, 55×12, 55×12, 60×8]
Working weight: 60kg (used 3 times, heaviest)
Average reps: 9.3 (rounded to 9)
```

### Case 6: Single Set Sessions

**Scenario**: User logs only 1 set for an exercise.

**Handling**:
1. Working weight = that single set's weight
2. Average reps = that set's reps
3. Next session: Hold action (conservative)
4. Rationale: "Match your last performance"

---

## Part 4: Implementation Examples

### Example 1: Successful Progression

**History**:
- Session 1 (7 days ago): Bench Press - 60kg × 10, 10, 9
- Session 2 (4 days ago): Bench Press - 60kg × 10, 10, 10
- Session 3 (today): Bench Press - 60kg × 10, 10, 10

**Analysis**:
- Working weight: 60kg
- Sessions at 60kg: 3
- Average reps: 10
- Last 2 sessions: [10, 10] (stable, ≥ average)

**Suggestion**:
- Action: `increase`
- Weight: 62.5kg
- Reps: 10
- Rationale: "All sets completed at 60 kg"
- Secondary: "Hold 60 kg" (safety option)

### Example 2: Regression Detection

**History**:
- Session 1 (14 days ago): Squat - 100kg × 8, 8, 8
- Session 2 (10 days ago): Squat - 100kg × 8, 8, 7
- Session 3 (7 days ago): Squat - 100kg × 7, 7, 6
- Session 4 (today): Squat - 100kg × 6, 6, 5

**Analysis**:
- Working weight: 100kg
- Historical average at 100kg: 7.75 reps
- Last 2 sessions: [6.3, 5.7] (both below 6.75)

**Suggestion**:
- Action: `decrease`
- Weight: 97.5kg
- Reps: 8
- Rationale: "Struggled at this weight - try lighter"

### Example 3: First-Time Exercise

**History**: None

**Suggestion**:
- Action: `start`
- Weight: 20kg (default for upper body)
- Reps: 8
- Rationale: "Starting weight"

### Example 4: Workout with Mixed Completion

**Workout**: "Push Day"
- Bench Press: Completed (3 sets)
- Overhead Press: Partial (2 sets logged, not marked complete)
- Tricep Extension: Skipped (0 sets)
- Lateral Raise: Completed (3 sets)

**Next Workout Suggestions**:
1. **Bench Press**: Increase to 62.5kg (progression logic)
2. **Overhead Press**: Hold at last logged weight (partial completion)
3. **Tricep Extension**: Hold at last full session weight (skipped)
4. **Lateral Raise**: Increase to next weight (progression logic)

---

## Part 5: Data Structures

### ProgressionSuggestion
```typescript
{
  action: 'increase' | 'hold' | 'decrease' | 'start';
  weight: number;
  reps: number;
  rationale: string;
}
```

### WorkingWeight
```typescript
{
  weight: number;
  avgReps: number;
}
```

### SessionData
```typescript
{
  weight: number;
  avgReps: number;
  date: number;
}
```

---

## Part 6: Algorithm Summary

### For Each Exercise:

1. **Extract working weight** from last session
2. **Get recent history** (last 5 sessions)
3. **Check conditions** in order:
   - No history → `start`
   - Regression pattern → `decrease`
   - Progression ready → `increase`
   - Recent increase → `hold`
   - Default → `hold`
4. **Generate suggestions** based on action
5. **Display** to user when starting exercise

### For Each Workout:

1. **Analyze completion** status of all exercises
2. **Include all exercises** in next workout (completed, partial, skipped)
3. **Apply exercise-level progression** to each
4. **Track metrics** for display (volume, intensity, duration)

---

## Part 7: Configuration

### Default Starting Weights
- Upper body compound: 20kg
- Lower body compound: 40kg
- Isolation exercises: 10kg
- Bodyweight exercises: User's bodyweight

### Progression Increments
- Weight increase: 2.5kg (standard)
- Weight decrease: 2.5kg (standard)
- Rep range: 6-12 reps (suggested)

### Time Thresholds
- Recent sessions: Last 5 sessions
- Break detection: > 14 days
- Significant break: > 30 days

---

## Implementation Notes

1. **Cache calculations**: Store working weights and progression suggestions to avoid recalculating
2. **Real-time updates**: Recalculate when new sets are logged
3. **User override**: Always allow manual weight/rep entry (suggestions are guides)
4. **Logging**: Track which suggestions users accept vs. override for algorithm refinement

---

## Future Enhancements

1. **Volume-based progression**: Track total volume trends, not just weight
2. **RPE integration**: If RPE is logged, use it to refine suggestions
3. **Exercise relationships**: Detect similar exercises and suggest weight conversions
4. **Periodization**: Support for deload weeks, volume phases, etc.
5. **Machine learning**: Learn from user patterns to personalize progression rates






