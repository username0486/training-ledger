import { describe, it, expect } from 'vitest';
import {
  findItemLocation,
  removeItem,
  insertItem,
  reorderWithinContainer,
  createGroupFromTwoExercises,
  addExerciseToGroup,
  flattenToNames,
  getGroupDisplayLabel,
  getGroupSetLabel,
  getGroupIndex,
  pullChildOutOfGroup,
  type ExerciseItem,
  type GroupItem,
  type SessionListItem,
} from './exerciseDnDUtils';

const ex = (id: string, name: string): ExerciseItem => ({ type: 'exercise', id, name });
const grp = (id: string, children: ExerciseItem[]): GroupItem => ({ type: 'group', id, children });

describe('exerciseDnDUtils', () => {
  describe('findItemLocation', () => {
    it('finds exercise in root', () => {
      const items: SessionListItem[] = [ex('a', 'A'), ex('b', 'B')];
      expect(findItemLocation(items, 'a')).toEqual({ container: 'root', index: 0 });
      expect(findItemLocation(items, 'b')).toEqual({ container: 'root', index: 1 });
    });

    it('finds exercise in group', () => {
      const items: SessionListItem[] = [grp('g1', [ex('a', 'A'), ex('b', 'B')])];
      expect(findItemLocation(items, 'a')).toEqual({ container: 'g1', index: 0, groupId: 'g1' });
      expect(findItemLocation(items, 'b')).toEqual({ container: 'g1', index: 1, groupId: 'g1' });
    });

    it('finds group at root', () => {
      const items: SessionListItem[] = [
        ex('a', 'A'),
        grp('g1', [ex('b', 'B'), ex('c', 'C')]),
        grp('g2', [ex('d', 'D')]),
      ];
      expect(findItemLocation(items, 'g1')).toEqual({ container: 'root', index: 1 });
      expect(findItemLocation(items, 'g2')).toEqual({ container: 'root', index: 2 });
    });

    it('returns null for missing id', () => {
      const items: SessionListItem[] = [ex('a', 'A')];
      expect(findItemLocation(items, 'x')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('removes exercise from root', () => {
      const items: SessionListItem[] = [ex('a', 'A'), ex('b', 'B')];
      const { nextItems, removed } = removeItem(items, { container: 'root', index: 0 });
      expect(nextItems).toEqual([ex('b', 'B')]);
      expect(removed).toEqual(ex('a', 'A'));
    });

    it('removes group from root', () => {
      const items: SessionListItem[] = [
        ex('a', 'A'),
        grp('g1', [ex('b', 'B'), ex('c', 'C')]),
        ex('d', 'D'),
      ];
      const { nextItems, removed } = removeItem(items, { container: 'root', index: 1 });
      expect(nextItems).toEqual([ex('a', 'A'), ex('d', 'D')]);
      expect(removed).toEqual(grp('g1', [ex('b', 'B'), ex('c', 'C')]));
    });

    it('removes exercise from group', () => {
      const items: SessionListItem[] = [grp('g1', [ex('a', 'A'), ex('b', 'B')])];
      const { nextItems, removed } = removeItem(items, { container: 'g1', index: 1, groupId: 'g1' });
      expect(nextItems).toEqual([ex('a', 'A')]);
      expect(removed).toEqual(ex('b', 'B'));
    });

    it('removes group when last child removed', () => {
      const items: SessionListItem[] = [grp('g1', [ex('a', 'A')])];
      const { nextItems, removed } = removeItem(items, { container: 'g1', index: 0, groupId: 'g1' });
      expect(nextItems).toEqual([]);
      expect(removed).toEqual(ex('a', 'A'));
    });
  });

  describe('insertItem', () => {
    it('inserts exercise at root', () => {
      const items: SessionListItem[] = [ex('a', 'A')];
      const next = insertItem(items, { container: 'root', index: 1 }, ex('b', 'B'), 1);
      expect(next).toEqual([ex('a', 'A'), ex('b', 'B')]);
    });

    it('inserts group at root', () => {
      const items: SessionListItem[] = [ex('a', 'A'), ex('c', 'C')];
      const group = grp('g1', [ex('b', 'B'), ex('d', 'D')]);
      const next = insertItem(items, { container: 'root', index: 1 }, group, 1);
      expect(next).toEqual([ex('a', 'A'), group, ex('c', 'C')]);
    });

    it('inserts exercise into group', () => {
      const items: SessionListItem[] = [grp('g1', [ex('a', 'A')])];
      const next = insertItem(items, { container: 'g1', index: 1, groupId: 'g1' }, ex('b', 'B'), 1);
      expect(next).toEqual([grp('g1', [ex('a', 'A'), ex('b', 'B')])]);
    });
  });

  describe('reorderWithinContainer', () => {
    it('reorders items', () => {
      const list = [ex('a', 'A'), ex('b', 'B'), ex('c', 'C')];
      const result = reorderWithinContainer(list, 0, 2);
      expect(result).toEqual([ex('b', 'B'), ex('c', 'C'), ex('a', 'A')]);
    });

    it('reorders groups among root items', () => {
      const list: SessionListItem[] = [
        ex('a', 'A'),
        grp('g1', [ex('b', 'B'), ex('c', 'C')]),
        ex('d', 'D'),
      ];
      const result = reorderWithinContainer(list, 1, 0);
      expect(result[0]).toEqual(grp('g1', [ex('b', 'B'), ex('c', 'C')]));
      expect(result[1]).toEqual(ex('a', 'A'));
      expect(result[2]).toEqual(ex('d', 'D'));
    });

    it('returns copy when start equals finish', () => {
      const list = [ex('a', 'A')];
      const result = reorderWithinContainer(list, 0, 0);
      expect(result).toEqual([ex('a', 'A')]);
      expect(result).not.toBe(list);
    });
  });

  describe('createGroupFromTwoExercises', () => {
    it('creates group from two root exercises', () => {
      const itemsAfterRemove: SessionListItem[] = [ex('a', 'A'), ex('c', 'C')];
      const next = createGroupFromTwoExercises(itemsAfterRemove, 0, ex('b', 'B'), ex('a', 'A'));
      expect(next.length).toBe(2);
      expect(next[0].type).toBe('group');
      expect((next[0] as GroupItem).children).toEqual([ex('a', 'A'), ex('b', 'B')]);
      expect(next[1]).toEqual(ex('c', 'C'));
    });
  });

  describe('addExerciseToGroup', () => {
    it('adds exercise to group', () => {
      const items: SessionListItem[] = [ex('c', 'C'), grp('g1', [ex('a', 'A'), ex('b', 'B')])];
      const next = addExerciseToGroup(items, { container: 'root', index: 0 }, 'g1', ex('c', 'C'), 2);
      expect(next.length).toBe(1);
      expect((next[0] as GroupItem).children).toEqual([ex('a', 'A'), ex('b', 'B'), ex('c', 'C')]);
    });
  });

  describe('flattenToNames', () => {
    it('flattens exercises only', () => {
      const items: SessionListItem[] = [ex('a', 'A'), ex('b', 'B')];
      expect(flattenToNames(items)).toEqual(['A', 'B']);
    });

    it('flattens exercises and groups', () => {
      const items: SessionListItem[] = [ex('a', 'A'), grp('g1', [ex('b', 'B'), ex('c', 'C')]), ex('d', 'D')];
      expect(flattenToNames(items)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('getGroupDisplayLabel', () => {
    it('returns neutral group label', () => {
      const r = getGroupDisplayLabel(1, 2);
      expect(r.title).toBe('Group 1');
      expect(r.subtitle).toBe('2 exercises');
    });

    it('handles singular exercise', () => {
      const r = getGroupDisplayLabel(2, 1);
      expect(r.title).toBe('Group 2');
      expect(r.subtitle).toBe('1 exercise');
    });
  });

  describe('getGroupSetLabel', () => {
    it('formats set label with neutral group title', () => {
      expect(getGroupSetLabel('Group 1', 1)).toBe('Group 1 — Set 1');
      expect(getGroupSetLabel('Group 2', 3)).toBe('Group 2 — Set 3');
    });
  });

  describe('getGroupIndex', () => {
    it('returns 1-based index from root list order', () => {
      const items: SessionListItem[] = [
        ex('a', 'A'),
        grp('g1', [ex('b', 'B'), ex('c', 'C')]),
        grp('g2', [ex('d', 'D'), ex('e', 'E')]),
      ];
      expect(getGroupIndex(items, 'g1')).toBe(1);
      expect(getGroupIndex(items, 'g2')).toBe(2);
    });
  });

  describe('pullChildOutOfGroup', () => {
    it('removes child from group and inserts at root', () => {
      const items: SessionListItem[] = [
        ex('a', 'A'),
        grp('g1', [ex('b', 'B'), ex('c', 'C'), ex('d', 'D')]),
        ex('e', 'E'),
      ];
      // insertRootIndex 2 = insert between group and e → [a, group, c, e]
      const next = pullChildOutOfGroup(items, 'g1', 'c', 2);
      expect(next.length).toBe(4);
      expect(next[0]).toEqual(ex('a', 'A'));
      expect((next[1] as GroupItem).children).toEqual([ex('b', 'B'), ex('d', 'D')]);
      expect(next[2]).toEqual(ex('c', 'C'));
      expect(next[3]).toEqual(ex('e', 'E'));
    });

    it('auto-ungroups when group drops to 1 child', () => {
      const items: SessionListItem[] = [grp('g1', [ex('a', 'A'), ex('b', 'B')])];
      const next = pullChildOutOfGroup(items, 'g1', 'b', 1);
      expect(next).toEqual([ex('a', 'A'), ex('b', 'B')]);
    });
  });
});
