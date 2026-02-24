import { describe, it, expect } from 'vitest';
import { estimateWorkoutDuration } from './duration';

describe('estimateWorkoutDuration', () => {
  const noPriorWorkouts: Array<{ templateId?: string; durationSec?: number; endedAt?: number }> = [];

  describe('solo exercises (regression)', () => {
    it('treats legacy number as solo exercises with 3 sets each', () => {
      const result = estimateWorkoutDuration('t1', 2, noPriorWorkouts);
      expect(result).not.toBeNull();
      expect(result!.minSec).toBeGreaterThan(0);
      expect(result!.maxSec).toBeGreaterThan(result!.minSec);
    });

    it('solo exercises: 3 sets × 40s + 2 rests, matches expected range', () => {
      const exercises = [
        { setCount: 3, groupId: null as string | null },
        { setCount: 3, groupId: null as string | null },
      ];
      const result = estimateWorkoutDuration('t1', exercises, noPriorWorkouts, {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
        groupRestSeconds: 60,
        transitionSeconds: 15,
      });
      expect(result).not.toBeNull();
      // Per solo: 3*40 + 2*60 = 240 min, 3*40 + 2*150 = 420 max
      // Between slots: 3–4 min
      // Total min: 240 + 240 + 180 = 660, max: 420 + 420 + 240 = 1080
      // Rounded up to nearest minute
      expect(result!.minSec).toBeGreaterThanOrEqual(600);
      expect(result!.maxSec).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('group estimation (superset)', () => {
    it('Example A: superset A(3 sets) + B(3 sets), setDuration=40s, transition=15s, groupRest=60s', () => {
      const exercises = [
        { setCount: 3, groupId: 'g1' },

        { setCount: 3, groupId: 'g1' },
      ];
      const result = estimateWorkoutDuration('t1', exercises, noPriorWorkouts, {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
        groupRestSeconds: 60,
        transitionSeconds: 15,
      });
      expect(result).not.toBeNull();
      // Each round: 40 + 15 + 40 = 95s
      // 3 rounds: 3 * 95 = 285s
      // Rest after rounds 1–2: 2 * 60 = 120s
      // Total: 285 + 120 = 405s (6m45s)
      const minSec = result!.minSec;
      const maxSec = result!.maxSec;
      expect(minSec).toBe(420); // ceil(405/60)*60 = 420
      expect(maxSec).toBe(420);
    });

    it('Example B: mismatched sets A(4) + B(2)', () => {
      const exercises = [
        { setCount: 4, groupId: 'g1' },
        { setCount: 2, groupId: 'g1' },
      ];
      const result = estimateWorkoutDuration('t1', exercises, noPriorWorkouts, {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
        groupRestSeconds: 60,
        transitionSeconds: 15,
      });
      expect(result).not.toBeNull();
      // rounds = 4
      // Round 1: A(40) + transition(15) + B(40) = 95s
      // Round 2: A(40) + transition(15) + B(40) = 95s
      // Round 3: A(40) only = 40s (no B, no transition)
      // Round 4: A(40) only = 40s
      // Rest: 3 * 60 = 180s
      // Total: 95 + 95 + 40 + 40 + 180 = 450s
      const totalSec = result!.minSec;
      expect(totalSec).toBeGreaterThanOrEqual(420); // ceil(450/60)*60 = 480
    });
  });

  describe('tri-set', () => {
    it('tri-set with 3 exercises, 3 sets each', () => {
      const exercises = [
        { setCount: 3, groupId: 'g1' },
        { setCount: 3, groupId: 'g1' },
        { setCount: 3, groupId: 'g1' },
      ];
      const result = estimateWorkoutDuration('t1', exercises, noPriorWorkouts, {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
        groupRestSeconds: 60,
        transitionSeconds: 15,
      });
      expect(result).not.toBeNull();
      // Each round: 40 + 15 + 40 + 15 + 40 = 150s
      // 3 rounds: 3 * 150 = 450s
      // Rest: 2 * 60 = 120s
      // Total: 570s
      expect(result!.minSec).toBeGreaterThanOrEqual(540);
    });
  });

  describe('grouping vs ungrouping', () => {
    it('grouped estimate <= ungrouped for same exercises', () => {
      const grouped = [
        { setCount: 3, groupId: 'g1' },
        { setCount: 3, groupId: 'g1' },
      ];
      const ungrouped = [
        { setCount: 3, groupId: null as string | null },
        { setCount: 3, groupId: null as string | null },
      ];
      const config = {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
        groupRestSeconds: 60,
        transitionSeconds: 15,
      };
      const groupedResult = estimateWorkoutDuration('t1', grouped, noPriorWorkouts, config);
      const ungroupedResult = estimateWorkoutDuration('t1', ungrouped, noPriorWorkouts, config);
      expect(groupedResult).not.toBeNull();
      expect(ungroupedResult).not.toBeNull();
      // Grouped: 3*95 + 2*60 = 405s, no between-slot transition
      // Ungrouped: 2 solo slots × (3*40 + 2*60) = 2*240 = 480s, plus 3–4 min between
      expect(groupedResult!.minSec).toBeLessThanOrEqual(ungroupedResult!.minSec);
    });
  });

  describe('prior completion', () => {
    it('uses last duration ±5 min when prior workout exists', () => {
      const result = estimateWorkoutDuration(
        't1',
        3,
        [{ templateId: 't1', durationSec: 1200, endedAt: Date.now() }]
      );
      expect(result).not.toBeNull();
      expect(result!.minSec).toBe(900); // 15 min
      expect(result!.maxSec).toBe(1500); // 25 min
    });
  });

  describe('edge cases', () => {
    it('returns null for empty exercises', () => {
      expect(estimateWorkoutDuration('t1', [], noPriorWorkouts)).toBeNull();
    });

    it('returns null for zero count (legacy)', () => {
      expect(estimateWorkoutDuration('t1', 0, noPriorWorkouts)).toBeNull();
    });

    it('single group with one member falls back to solo logic', () => {
      const exercises = [{ setCount: 3, groupId: 'g1' }];
      const result = estimateWorkoutDuration('t1', exercises, noPriorWorkouts, {
        setDurationSeconds: 40,
        restMinSeconds: 60,
        restMaxSeconds: 150,
      });
      expect(result).not.toBeNull();
      // Solo: 3*40 + 2*60 = 240s
      expect(result!.minSec).toBeGreaterThanOrEqual(240);
    });
  });
});
