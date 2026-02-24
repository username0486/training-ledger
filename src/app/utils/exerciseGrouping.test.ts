import { describe, it, expect } from 'vitest';
import { swapGroupMember, getGroupMembersOrdered } from './exerciseGrouping';
import type { Exercise } from '../types';

const ex = (id: string, name: string, groupId?: string): Exercise => ({
  id,
  name,
  sets: [],
  groupId: groupId ?? undefined,
});

describe('exerciseGrouping', () => {
  describe('swapGroupMember', () => {
    it('swaps first child (index 0) correctly - regression for findIndex returns 0', () => {
      // Group at start: A (index 0), B (index 1). Solo C at end.
      // sourceIndex=0 must not be treated as falsy
      const groupId = 'g1';
      const exercises: Exercise[] = [
        ex('a', 'A', groupId),
        ex('b', 'B', groupId),
        ex('c', 'C'),
      ];

      const result = swapGroupMember(exercises, groupId, 'a', 'c');

      // Swap removes source (a) and moves replacement (c) into group: [c, b]
      expect(result).toHaveLength(2);
      const members = getGroupMembersOrdered(result, groupId);
      expect(members.map(m => m.id)).toEqual(['c', 'b']);
      expect(members[0].name).toBe('C');
      expect(members[1].name).toBe('B');
      // C should be first in group (replaced A at index 0)
      expect(result[0].id).toBe('c');
      expect(result[0].groupId).toBe(groupId);
    });

    it('swaps second child (index 1) correctly', () => {
      const groupId = 'g1';
      const exercises: Exercise[] = [
        ex('a', 'A', groupId),
        ex('b', 'B', groupId),
        ex('c', 'C'),
      ];

      const result = swapGroupMember(exercises, groupId, 'b', 'c');

      const members = getGroupMembersOrdered(result, groupId);
      expect(members.map(m => m.id)).toEqual(['a', 'c']);
      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('c');
    });

    it('firstGroupIndex 0 is handled correctly - regression for findIndex returns 0', () => {
      // Group at indices 0,1; replacement at index 2. firstGroupIndex will be 0.
      const groupId = 'g1';
      const exercises: Exercise[] = [
        ex('a', 'A', groupId),
        ex('b', 'B', groupId),
        ex('c', 'C'),
      ];

      const result = swapGroupMember(exercises, groupId, 'a', 'c');

      expect(result[0].id).toBe('c');
      expect(result[0].groupId).toBe(groupId);
    });
  });
});
