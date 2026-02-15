# Input Persistence Tests for WorkoutSessionScreen

This document describes the expected behavior for input persistence when navigating between exercise cards.

## Test Scenarios

### Test 1: User enters input, navigates away, returns
**Given:**
- User is on Exercise A
- User enters weight: "60" and reps: "10" (but hasn't logged the set yet)
- User navigates to Exercise B
- User navigates back to Exercise A

**Expected:**
- Weight field shows "60"
- Reps field shows "10"
- Input values are preserved exactly as entered

### Test 2: User enters partial input, navigates away, returns
**Given:**
- User is on Exercise A
- User enters weight: "60" but leaves reps empty
- User navigates to Exercise B
- User navigates back to Exercise A

**Expected:**
- Weight field shows "60"
- Reps field is empty
- Partial input is preserved

### Test 3: User doesn't enter input, navigates away, returns
**Given:**
- User is on Exercise A (no sets logged yet)
- User doesn't enter any input
- User navigates to Exercise B
- User navigates back to Exercise A

**Expected:**
- Weight and reps fields are empty (no saved input to restore)
- If Exercise A has sets, fields should prefill from last set

### Test 4: User logs a set, then navigates away and back
**Given:**
- User is on Exercise A
- User logs a set with weight: 60kg, reps: 10
- After logging, fields are prefilled with "60" and "10"
- User navigates to Exercise B
- User navigates back to Exercise A

**Expected:**
- Weight field shows "60"
- Reps field shows "10"
- Prefilled values from last logged set are preserved

### Test 5: User enters input, logs set, navigates away and back
**Given:**
- User is on Exercise A
- User enters weight: "65" and reps: "12" (preparing next set)
- User logs the set
- After logging, fields are prefilled with "65" and "12" (from the set just logged)
- User navigates to Exercise B
- User navigates back to Exercise A

**Expected:**
- Weight field shows "65"
- Reps field shows "12"
- Values from the last logged set are preserved

### Test 6: User enters input, then taps chip to prefill
**Given:**
- User is on Exercise A
- User enters weight: "60" and reps: "10"
- User taps a chip from LastSessionStats that sets weight: "70" and reps: "12"

**Expected:**
- Weight field shows "70"
- Reps field shows "12"
- Chip values overwrite user input (chip tap is explicit prefill action)

### Test 7: Multiple exercises with different saved inputs
**Given:**
- User is on Exercise A, enters weight: "60", reps: "10", navigates away
- User is on Exercise B, enters weight: "80", reps: "8", navigates away
- User navigates back to Exercise A

**Expected:**
- Exercise A shows weight: "60", reps: "10"
- User navigates to Exercise B

**Expected:**
- Exercise B shows weight: "80", reps: "8"
- Each exercise maintains its own saved input state

## Implementation Details

The implementation uses:
- `exerciseInputs` Map: Stores weight and reps per exercise ID
- `previousExerciseIdRef`: Tracks previous exercise ID to detect navigation
- Save useEffect: Saves inputs when they change (but not during navigation)
- Restore useEffect: Restores saved inputs or prefills from last set when exercise changes

### Test 8: Grouped exercises - input persistence within group
**Given:**
- Exercise A and Exercise B are in a group (superset)
- User is on Exercise A in the group, enters weight: "60", reps: "10"
- User navigates to Exercise B in the same group
- User navigates back to Exercise A

**Expected:**
- Exercise A shows weight: "60", reps: "10"
- User-entered values are preserved even when navigating within the group

### Test 9: Grouped exercises - navigate away from group and back
**Given:**
- Exercise A and Exercise B are in a group
- User is on Exercise A, enters weight: "60", reps: "10"
- User navigates to standalone Exercise C (outside the group)
- User navigates back to the group (Exercise A)

**Expected:**
- Exercise A shows weight: "60", reps: "10"
- Values persist even when navigating completely away from the group

### Test 10: Grouped exercises - multiple exercises with different inputs
**Given:**
- Exercise A and Exercise B are in a group
- User enters weight: "60", reps: "10" for Exercise A
- User enters weight: "80", reps: "8" for Exercise B
- User navigates away and back to the group

**Expected:**
- Exercise A shows weight: "60", reps: "10"
- Exercise B shows weight: "80", reps: "8"
- Each exercise in the group maintains its own saved input state

### Test 11: Grouped exercises - log set, then navigate
**Given:**
- Exercise A and Exercise B are in a group
- User logs a set for both exercises (weight: 60kg, reps: 10)
- After logging, fields are prefilled with "60" and "10"
- User navigates away and back

**Expected:**
- Exercise A shows weight: "60", reps: "10"
- Exercise B shows weight: "60", reps: "10"
- Prefilled values from last logged set are preserved

## Edge Cases Handled

1. **Empty inputs**: Empty strings are not saved (to avoid cluttering the map)
2. **Navigation detection**: Using previousExerciseIdRef to distinguish between user input and restoration
3. **Initial load**: First exercise loads with empty inputs or prefills from last set
4. **Set logging**: After logging, inputs are updated and saved for next set
5. **Chip taps**: Chip taps explicitly set inputs (overwriting any saved state)
6. **Grouped exercises**: Each exercise in a group maintains its own input state, even when navigating within the group
7. **Group navigation**: Inputs persist when navigating away from and back to groups
