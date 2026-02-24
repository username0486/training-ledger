import { describe, it, expect } from 'vitest';
import { reorderArray } from './reorderUtils';

describe('reorderArray', () => {
  it('moves item from startIndex to finishIndex', () => {
    const list = ['a', 'b', 'c', 'd'];
    const result = reorderArray(list, 0, 2);
    expect(result).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves item down the list', () => {
    const list = ['a', 'b', 'c', 'd'];
    const result = reorderArray(list, 0, 3);
    expect(result).toEqual(['b', 'c', 'd', 'a']);
  });

  it('moves item up the list', () => {
    const list = ['a', 'b', 'c', 'd'];
    const result = reorderArray(list, 3, 0);
    expect(result).toEqual(['d', 'a', 'b', 'c']);
  });

  it('returns new array when startIndex equals finishIndex', () => {
    const list = ['a', 'b', 'c'];
    const result = reorderArray(list, 1, 1);
    expect(result).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(list);
  });

  it('does not mutate the original array', () => {
    const list = ['a', 'b', 'c'];
    const original = [...list];
    reorderArray(list, 0, 2);
    expect(list).toEqual(original);
  });

  it('handles invalid startIndex by returning copy', () => {
    const list = ['a', 'b', 'c'];
    const result = reorderArray(list, -1, 1);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('handles invalid finishIndex by returning copy', () => {
    const list = ['a', 'b', 'c'];
    const result = reorderArray(list, 0, 10);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('works with objects', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = reorderArray(list, 2, 0);
    expect(result).toEqual([{ id: 3 }, { id: 1 }, { id: 2 }]);
  });
});
