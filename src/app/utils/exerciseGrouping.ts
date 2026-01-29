/**
 * Exercise grouping utilities for supersets/tri-sets
 * Grouping is list-level metadata only - does not affect set logging
 */

import { Exercise, AdHocLoggingSession } from '../types';

/**
 * Generate a unique group ID
 */
export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all exercises in a group
 */
export function getGroupExercises(exercises: Exercise[], groupId: string): Exercise[] {
  return exercises.filter(ex => ex.groupId === groupId);
}

/**
 * Check if exercises are contiguous in the list
 */
export function areExercisesContiguous(exercises: Exercise[], exerciseIds: string[]): boolean {
  const indices = exerciseIds.map(id => exercises.findIndex(ex => ex.id === id)).filter(i => i !== -1);
  if (indices.length === 0) return true;
  
  indices.sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

/**
 * Ensure grouped exercises are contiguous by reordering
 */
export function ensureGroupContiguous(exercises: Exercise[], groupId: string): Exercise[] {
  const groupExercises = getGroupExercises(exercises, groupId);
  const otherExercises = exercises.filter(ex => ex.groupId !== groupId);
  
  if (groupExercises.length === 0) return exercises;
  
  // Find the first position of any group member
  const firstGroupIndex = exercises.findIndex(ex => ex.groupId === groupId);
  
  // Reorder: place group exercises together at the first position
  const reordered: Exercise[] = [...exercises];
  groupExercises.forEach((groupEx, idx) => {
    const currentIndex = reordered.findIndex(ex => ex.id === groupEx.id);
    if (currentIndex !== firstGroupIndex + idx) {
      // Remove from current position
      reordered.splice(currentIndex, 1);
      // Insert at correct position
      reordered.splice(firstGroupIndex + idx, 0, groupEx);
    }
  });
  
  return reordered;
}

/**
 * Create a new group from exercise IDs
 */
export function createGroup(exercises: Exercise[], instanceIds: string[]): Exercise[] {
  if (instanceIds.length < 2) return exercises;
  
  const groupId = generateGroupId();
  const updated = exercises.map(ex => 
    instanceIds.includes(ex.id) ? { ...ex, groupId } : ex
  );
  
  return ensureGroupContiguous(updated, groupId);
}

/**
 * Add an exercise to an existing group
 */
export function addToGroup(exercises: Exercise[], groupId: string, instanceId: string): Exercise[] {
  const updated = exercises.map(ex => 
    ex.id === instanceId ? { ...ex, groupId } : ex
  );
  
  return ensureGroupContiguous(updated, groupId);
}

/**
 * Merge two groups into one
 */
export function mergeGroups(exercises: Exercise[], groupId1: string, groupId2: string): Exercise[] {
  // Use groupId1 as canonical
  const updated = exercises.map(ex => 
    ex.groupId === groupId2 ? { ...ex, groupId: groupId1 } : ex
  );
  
  return ensureGroupContiguous(updated, groupId1);
}

/**
 * Remove an exercise from its group
 */
export function ungroup(exercises: Exercise[], instanceId: string): Exercise[] {
  const exercise = exercises.find(ex => ex.id === instanceId);
  if (!exercise || !exercise.groupId) return exercises;
  
  const groupId = exercise.groupId;
  const groupExercises = getGroupExercises(exercises, groupId);
  
  // If only 2 exercises in group, dissolve the group
  if (groupExercises.length <= 2) {
    return exercises.map(ex => 
      ex.groupId === groupId ? { ...ex, groupId: null } : ex
    );
  }
  
  // Otherwise, just remove this exercise from the group
  return exercises.map(ex => 
    ex.id === instanceId ? { ...ex, groupId: null } : ex
  );
}

/**
 * Remove all exercises from a group (dissolve group)
 */
export function ungroupAll(exercises: Exercise[], groupId: string): Exercise[] {
  return exercises.map(ex => 
    ex.groupId === groupId ? { ...ex, groupId: null } : ex
  );
}

/**
 * Get ordered group members (in display order)
 */
export function getGroupMembersOrdered(exercises: Exercise[], groupId: string): Exercise[] {
  const members = getGroupExercises(exercises, groupId);
  // Sort by position in exercises array to maintain display order
  return members.sort((a, b) => {
    const indexA = exercises.findIndex(ex => ex.id === a.id);
    const indexB = exercises.findIndex(ex => ex.id === b.id);
    return indexA - indexB;
  });
}

/**
 * Swap a group member with a replacement exercise
 * - Removes source member from group (preserves sets/history)
 * - Inserts replacement at the same position
 * - Maintains group size
 * - Ensures replacement is not already grouped
 */
export function swapGroupMember(
  exercises: Exercise[],
  groupId: string,
  sourceMemberInstanceId: string,
  replacementInstanceId: string
): Exercise[] {
  // Get ordered group members
  const members = getGroupMembersOrdered(exercises, groupId);
  
  // Find source member index
  const sourceIndex = members.findIndex(m => m.id === sourceMemberInstanceId);
  if (sourceIndex === -1) {
    console.error('[swapGroupMember] Source member not found in group', {
      groupId,
      sourceMemberInstanceId,
      memberIds: members.map(m => m.id),
    });
    return exercises; // Abort - no changes
  }
  
  // Find replacement exercise
  const replacement = exercises.find(ex => ex.id === replacementInstanceId);
  if (!replacement) {
    console.error('[swapGroupMember] Replacement exercise not found', {
      replacementInstanceId,
      exerciseIds: exercises.map(ex => ex.id),
    });
    return exercises; // Abort - no changes
  }
  
  // Enforce "not already grouped"
  if (replacement.groupId !== null && replacement.groupId !== undefined) {
    console.warn('[swapGroupMember] Replacement is already in a group', {
      replacementInstanceId,
      existingGroupId: replacement.groupId,
    });
    // Return unchanged - caller should show error message
    return exercises;
  }
  
  // Remove source member from group (preserve sets/history)
  const updated = exercises.map(ex => 
    ex.id === sourceMemberInstanceId 
      ? { ...ex, groupId: null } // Remove from group, return to standalone
      : ex
  );
  
  // Add replacement to group at the same position
  // First, find where the group starts in the full list
  const firstGroupIndex = updated.findIndex(ex => {
    if (ex.groupId !== groupId) return false;
    // Find the first member that's still in the group (after removing source)
    return ex.id !== sourceMemberInstanceId;
  });
  
  if (firstGroupIndex === -1) {
    // Group is empty or invalid - shouldn't happen, but handle gracefully
    console.error('[swapGroupMember] Group not found after removing source member');
    return updated;
  }
  
  // Calculate target position: firstGroupIndex + sourceIndex
  // But we need to account for the fact that source member is now ungrouped
  const targetIndex = firstGroupIndex + sourceIndex;
  
  // Find current position of replacement in the list
  const replacementCurrentIndex = updated.findIndex(ex => ex.id === replacementInstanceId);
  
  // Remove replacement from current position
  const replacementExercise = updated[replacementCurrentIndex];
  const withoutReplacement = updated.filter((_, idx) => idx !== replacementCurrentIndex);
  
  // Insert replacement at target position with groupId
  const withReplacement = [
    ...withoutReplacement.slice(0, targetIndex),
    { ...replacementExercise, groupId },
    ...withoutReplacement.slice(targetIndex),
  ];
  
  // Ensure group remains contiguous
  return ensureGroupContiguous(withReplacement, groupId);
}

/**
 * Get group information for an exercise
 */
export function getGroupInfo(exercises: Exercise[], exerciseId: string): {
  groupId: string | null;
  groupMembers: Exercise[];
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
} {
  const exercise = exercises.find(ex => ex.id === exerciseId);
  if (!exercise || !exercise.groupId) {
    return {
      groupId: null,
      groupMembers: [],
      isFirstInGroup: false,
      isLastInGroup: false,
    };
  }
  
  const groupMembers = getGroupExercises(exercises, exercise.groupId);
  const sortedMembers = groupMembers.sort((a, b) => {
    const indexA = exercises.findIndex(ex => ex.id === a.id);
    const indexB = exercises.findIndex(ex => ex.id === b.id);
    return indexA - indexB;
  });
  
  const exerciseIndex = sortedMembers.findIndex(ex => ex.id === exerciseId);
  
  return {
    groupId: exercise.groupId,
    groupMembers: sortedMembers,
    isFirstInGroup: exerciseIndex === 0,
    isLastInGroup: exerciseIndex === sortedMembers.length - 1,
  };
}

/**
 * Filter out grouped exercise members from a list
 * Only returns exercises that are not part of a group (or are the first member of a group)
 */
export function filterGroupedMembers(exercises: Exercise[]): Exercise[] {
  const seenGroupIds = new Set<string | null>();
  const result: Exercise[] = [];
  
  exercises.forEach(ex => {
    if (!ex.groupId) {
      // Not grouped - include it
      result.push(ex);
    } else {
      // Grouped - only include if we haven't seen this group yet (first member)
      if (!seenGroupIds.has(ex.groupId)) {
        seenGroupIds.add(ex.groupId);
        // Don't include individual members - groups are handled in primary area
        // If you need to represent the group, return just the first member
        // For now, we exclude all grouped members from lists
      }
    }
  });
  
  return result.filter(ex => !ex.groupId);
}

/**
 * Build a list of session items from exercises
 * Groups exercises into supersets (single items) and keeps individual exercises separate
 */
export interface SessionItem {
  id: string; // Unique ID: exerciseId for single, groupId for superset
  type: 'exercise' | 'superset';
  exerciseIds: string[]; // All exercise IDs in this item
  isComplete: boolean; // True if all exercises in item are complete
}

export function buildSessionItems(exercises: Exercise[]): SessionItem[] {
  const items: SessionItem[] = [];
  const processedIds = new Set<string>();
  const groupMap = new Map<string, Exercise[]>();
  
  // First pass: collect all groups
  exercises.forEach(ex => {
    if (ex.groupId) {
      if (!groupMap.has(ex.groupId)) {
        groupMap.set(ex.groupId, []);
      }
      groupMap.get(ex.groupId)!.push(ex);
    }
  });
  
  // Second pass: build items
  exercises.forEach(ex => {
    if (processedIds.has(ex.id)) return;
    
    if (ex.groupId && groupMap.has(ex.groupId)) {
      // This is part of a group - create superset item
      const groupMembers = groupMap.get(ex.groupId)!;
      if (groupMembers.length >= 2) {
        items.push({
          id: ex.groupId,
          type: 'superset',
          exerciseIds: groupMembers.map(m => m.id),
          isComplete: groupMembers.every(m => m.isComplete || false),
        });
        groupMembers.forEach(m => processedIds.add(m.id));
      } else {
        // Group with only one member - treat as individual
        items.push({
          id: ex.id,
          type: 'exercise',
          exerciseIds: [ex.id],
          isComplete: ex.isComplete || false,
        });
        processedIds.add(ex.id);
      }
    } else {
      // Individual exercise
      items.push({
        id: ex.id,
        type: 'exercise',
        exerciseIds: [ex.id],
        isComplete: ex.isComplete || false,
      });
      processedIds.add(ex.id);
    }
  });
  
  // Sort items to maintain exercise order
  return items.sort((a, b) => {
    const aIndex = exercises.findIndex(ex => a.exerciseIds.includes(ex.id));
    const bIndex = exercises.findIndex(ex => b.exerciseIds.includes(ex.id));
    return aIndex - bIndex;
  });
}

/**
 * Apply grouping operations to AdHocLoggingSession
 */
export function applyGroupingToSession(
  session: AdHocLoggingSession,
  updatedExercises: Exercise[]
): AdHocLoggingSession {
  // Normalize input: ensure updatedExercises is an array
  let exercisesArray: Exercise[];
  if (Array.isArray(updatedExercises)) {
    exercisesArray = updatedExercises;
  } else if (updatedExercises && typeof updatedExercises === 'object' && 'exercises' in updatedExercises && Array.isArray((updatedExercises as any).exercises)) {
    // Handle case where a session object is passed instead of exercises array
    exercisesArray = (updatedExercises as any).exercises;
  } else if (updatedExercises && typeof updatedExercises === 'object') {
    // Handle case where a map/record is passed
    exercisesArray = Object.values(updatedExercises);
  } else {
    // Fallback: use session exercises
    console.error('[applyGroupingToSession] Invalid updatedExercises type, using session exercises', typeof updatedExercises, updatedExercises);
    exercisesArray = session.exercises;
  }

  if (!Array.isArray(exercisesArray) || exercisesArray.length === 0) {
    console.error('[applyGroupingToSession] exercisesArray is not a valid array', exercisesArray);
    return session;
  }

  // Create a map of original session exercises to preserve metadata
  const originalExerciseMap = new Map(session.exercises.map(ex => [ex.id, ex]));
  
  // Update exercises and maintain order
  const exerciseMap = new Map(exercisesArray.map(ex => [ex.id, ex]));
  const orderedExercises = session.exerciseOrder
    .map(id => exerciseMap.get(id))
    .filter((ex): ex is NonNullable<typeof ex> => ex !== undefined);
  
  // Update groups map
  const groups: { [groupId: string]: { createdAt: number } } = session.groups || {};
  exercisesArray.forEach(ex => {
    if (ex.groupId && !groups[ex.groupId]) {
      groups[ex.groupId] = { createdAt: Date.now() };
    }
  });
  
  // Reorder exerciseOrder to ensure grouped exercises are contiguous
  const reorderedExerciseOrder: string[] = [];
  const processedIds = new Set<string>();
  
  exercisesArray.forEach(ex => {
    if (processedIds.has(ex.id)) return;
    
    if (ex.groupId) {
      // Add all exercises in the group together
      const groupMembers = exercisesArray.filter(e => e.groupId === ex.groupId);
      groupMembers.forEach(member => {
        if (!processedIds.has(member.id)) {
          reorderedExerciseOrder.push(member.id);
          processedIds.add(member.id);
        }
      });
    } else {
      // Add ungrouped exercise
      reorderedExerciseOrder.push(ex.id);
      processedIds.add(ex.id);
    }
  });
  
  // Add any exercises that weren't in updatedExercises (shouldn't happen, but defensive)
  session.exerciseOrder.forEach(id => {
    if (!processedIds.has(id)) {
      reorderedExerciseOrder.push(id);
    }
  });
  
  return {
    ...session,
    exerciseOrder: reorderedExerciseOrder,
    exercises: reorderedExerciseOrder.map(id => {
      const updatedEx = exerciseMap.get(id);
      const originalEx = originalExerciseMap.get(id);
      if (!updatedEx || !originalEx) {
        // Fallback - shouldn't happen
        return originalEx || updatedEx as any;
      }
      return {
        ...originalEx,
        sets: updatedEx.sets,
        isComplete: updatedEx.isComplete,
        groupId: updatedEx.groupId || null,
      };
    }),
    groups,
  };
}
