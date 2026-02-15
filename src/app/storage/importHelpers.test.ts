import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseAndValidateImport,
  mergeImportData,
  type ImportPreview,
} from './importHelpers';
import type { AppState } from './types';

describe('parseAndValidateImport', () => {
  it('rejects invalid JSON', () => {
    const result = parseAndValidateImport('not json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid JSON/i);
  });

  it('rejects valid JSON but wrong schema (no data, no workouts)', () => {
    const result = parseAndValidateImport('{"foo": "bar"}');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid|missing/i);
  });

  it('rejects schema with schemaVersion but no data', () => {
    const result = parseAndValidateImport('{"schemaVersion": 2}');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid|structure/i);
  });

  it('accepts valid v2 schema', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      data: {
        workouts: [],
        templates: [],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession: null,
      },
    });
    const result = parseAndValidateImport(json);
    expect(result.success).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.preview?.workouts).toBe(0);
    expect(result.preview?.sets).toBe(0);
    expect(result.preview?.detectedVersion).toBe(2);
  });

  it('accepts valid v2 schema with workouts and counts correctly', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      data: {
        workouts: [
          {
            id: 'w1',
            name: 'Workout 1',
            exercises: [
              {
                id: 'e1',
                name: 'Bench',
                sets: [
                  { id: 's1', weight: 60, reps: 10, timestamp: 1000 },
                  { id: 's2', weight: 60, reps: 8, timestamp: 2000 },
                ],
              },
            ],
            startTime: 1000,
            startedAt: 1000,
            isComplete: true,
          },
        ],
        templates: [{ id: 't1', name: 'Template', exerciseNames: [] }],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession: null,
      },
    });
    const result = parseAndValidateImport(json);
    expect(result.success).toBe(true);
    expect(result.preview?.workouts).toBe(1);
    expect(result.preview?.exercises).toBe(1);
    expect(result.preview?.sessions).toBe(1);
    expect(result.preview?.sets).toBe(2);
    expect(result.preview?.templates).toBe(1);
  });
});

describe('mergeImportData', () => {
  const empty: AppState = {
    workouts: [],
    templates: [],
    incompleteExerciseSession: null,
    incompleteWorkoutId: null,
    adHocSession: null,
  };

  it('merges workouts: dedupes by id, prefers newest on conflict', () => {
    const existing: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w1',
          name: 'Old',
          exercises: [],
          startTime: 1000,
          startedAt: 1000,
          endedAt: 2000,
          isComplete: true,
        },
      ],
    };
    const imported: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w1',
          name: 'New',
          exercises: [],
          startTime: 3000,
          startedAt: 3000,
          endedAt: 4000,
          isComplete: true,
        },
      ],
    };
    const merged = mergeImportData(imported, existing);
    expect(merged.workouts).toHaveLength(1);
    expect(merged.workouts[0].name).toBe('New');
  });

  it('merges workouts: keeps existing when it is newer', () => {
    const existing: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w1',
          name: 'Newer',
          exercises: [],
          startTime: 5000,
          startedAt: 5000,
          endedAt: 6000,
          isComplete: true,
        },
      ],
    };
    const imported: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w1',
          name: 'Older',
          exercises: [],
          startTime: 1000,
          startedAt: 1000,
          endedAt: 2000,
          isComplete: true,
        },
      ],
    };
    const merged = mergeImportData(imported, existing);
    expect(merged.workouts).toHaveLength(1);
    expect(merged.workouts[0].name).toBe('Newer');
  });

  it('merges workouts: adds new workouts without duplicates', () => {
    const existing: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w1',
          name: 'One',
          exercises: [],
          startTime: 1000,
          startedAt: 1000,
          isComplete: true,
        },
      ],
    };
    const imported: AppState = {
      ...empty,
      workouts: [
        {
          id: 'w2',
          name: 'Two',
          exercises: [],
          startTime: 2000,
          startedAt: 2000,
          isComplete: true,
        },
      ],
    };
    const merged = mergeImportData(imported, existing);
    expect(merged.workouts).toHaveLength(2);
    expect(merged.workouts.map((w) => w.name).sort()).toEqual(['One', 'Two']);
  });

  it('merges templates: dedupes by id, prefers newest updatedAt', () => {
    const existing: AppState = {
      ...empty,
      templates: [
        { id: 't1', name: 'Old', exerciseNames: [], createdAt: 1000, updatedAt: 1000 },
      ],
    };
    const imported: AppState = {
      ...empty,
      templates: [
        { id: 't1', name: 'New', exerciseNames: [], createdAt: 1000, updatedAt: 3000 },
      ],
    };
    const merged = mergeImportData(imported, existing);
    expect(merged.templates).toHaveLength(1);
    expect(merged.templates[0].name).toBe('New');
  });

  it('merges templates: keeps existing when it is newer', () => {
    const existing: AppState = {
      ...empty,
      templates: [
        { id: 't1', name: 'Newer', exerciseNames: [], createdAt: 1000, updatedAt: 5000 },
      ],
    };
    const imported: AppState = {
      ...empty,
      templates: [
        { id: 't1', name: 'Older', exerciseNames: [], createdAt: 1000, updatedAt: 1000 },
      ],
    };
    const merged = mergeImportData(imported, existing);
    expect(merged.templates).toHaveLength(1);
    expect(merged.templates[0].name).toBe('Newer');
  });
});
