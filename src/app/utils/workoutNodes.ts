/**
 * Convert between WorkoutNode[] (template structure) and Exercise[] (session structure).
 * Session uses flat Exercise[] with groupId for grouping.
 */

import type { Exercise } from '../types';
import type { WorkoutNode, WorkoutExerciseNode, WorkoutGroupNode } from '../types/templates';

/**
 * Convert WorkoutNode[] to Exercise[] with groupId for session.
 */
export function nodesToExercises(
  nodes: WorkoutNode[],
  workoutId: string
): Exercise[] {
  const result: Exercise[] = [];
  let idx = 0;
  for (const node of nodes) {
    if (node.type === 'exercise') {
      result.push({
        id: `${workoutId}-ex-${idx}-${Math.random().toString(36).slice(2, 9)}`,
        name: node.name,
        sets: [],
        isComplete: false,
      });
      idx++;
    } else {
      const groupId = node.id;
      for (const child of node.children) {
        result.push({
          id: `${workoutId}-ex-${idx}-${Math.random().toString(36).slice(2, 9)}`,
          name: child.name,
          sets: [],
          isComplete: false,
          groupId,
        });
        idx++;
      }
    }
  }
  return result;
}

/**
 * Convert exerciseNames (legacy) to WorkoutNode[].
 */
export function namesToNodes(
  names: string[],
  templateId: string
): WorkoutNode[] {
  return names.map((name, i) => ({
    type: 'exercise' as const,
    id: `ex-${templateId}-${i}-${name}`,
    name,
  }));
}
