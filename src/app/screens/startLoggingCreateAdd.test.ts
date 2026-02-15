/**
 * Unit/logic tests for Start Logging "Create and add" flow
 * - creates + adds when query not in db
 * - prevents duplicate by name (case-insensitive) by reusing existing exercise
 * - works when multiple selections are active (Start workout vs Start {exercise})
 */

import { describe, it, expect } from 'vitest';
import { addExerciseToDb, getAllExercisesList } from '../../utils/exerciseDb';
import { normalizeExerciseName } from '@/utils/exerciseDb/types';
import type { AdHocLoggingSession } from '../../types';
import { updateSessionClassificationAndName } from '../utils/sessionNaming';

// Validation: query trimmed length >= 2 (matches StartLoggingScreen logic)
function validateCreateQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Enter at least 2 characters' };
  }
  return { valid: true };
}

// Pure logic: build session with new exercise added (matches handleAddNewExercise)
function buildSessionWithExercise(
  session: AdHocLoggingSession | null,
  exercise: { id: string; name: string; source: string }
): AdHocLoggingSession {
  const now = Date.now();
  const exerciseInstanceId = `${session?.id || `session-${now}`}-ex-${now}-${Math.random()}`;
  const newSession: AdHocLoggingSession = session || {
    id: `session-${now}`,
    createdAt: now,
    status: 'active',
    exerciseOrder: [],
    exercises: [],
  };
  const updated: AdHocLoggingSession = {
    ...newSession,
    exerciseOrder: [...newSession.exerciseOrder, exerciseInstanceId],
    exercises: [
      ...newSession.exercises,
      {
        id: exerciseInstanceId,
        exerciseId: exercise.id,
        name: exercise.name,
        source: exercise.source,
        addedAt: now,
        sets: [],
        isComplete: false,
      },
    ],
  };
  return updateSessionClassificationAndName(updated, updated.exercises.length);
}

describe('Create and add - validation', () => {
  it('rejects query shorter than 2 chars', () => {
    expect(validateCreateQuery('')).toEqual({ valid: false, error: 'Enter at least 2 characters' });
    expect(validateCreateQuery('a')).toEqual({ valid: false, error: 'Enter at least 2 characters' });
    expect(validateCreateQuery(' ')).toEqual({ valid: false, error: 'Enter at least 2 characters' });
  });

  it('accepts query with 2+ chars', () => {
    expect(validateCreateQuery('ab')).toEqual({ valid: true });
    expect(validateCreateQuery('  bench  ')).toEqual({ valid: true });
    expect(validateCreateQuery('My Custom Exercise')).toEqual({ valid: true });
  });
});

describe('Create and add - create + add when query not in db', () => {
  it('creates new user exercise and adds to session when query not in db', () => {
    const uniqueName = `Custom Exercise ${Date.now()}`;
    const exercise = addExerciseToDb(uniqueName);

    expect(exercise).toBeDefined();
    expect(exercise.name).toBe(uniqueName);
    expect(exercise.source).toBe('user');
    expect(exercise.id).toMatch(/^usr:/);
    expect('createdAt' in exercise && exercise.createdAt).toBeDefined();

    const session = buildSessionWithExercise(null, exercise);
    expect(session.exercises).toHaveLength(1);
    expect(session.exercises[0].name).toBe(uniqueName);
    expect(session.exercises[0].exerciseId).toBe(exercise.id);
  });
});

describe('Create and add - prevents duplicate by name (case-insensitive)', () => {
  it('reuses existing exercise when duplicate by name (case-insensitive)', () => {
    const name = `Dup Test ${Date.now()}`;
    const first = addExerciseToDb(name);
    const second = addExerciseToDb(name.toLowerCase());
    const third = addExerciseToDb(name.toUpperCase());

    expect(first.id).toBe(second.id);
    expect(second.id).toBe(third.id);
    expect(normalizeExerciseName(first.name)).toBe(normalizeExerciseName(second.name));

    const all = getAllExercisesList();
    const matches = all.filter((ex) => normalizeExerciseName(ex.name) === normalizeExerciseName(name));
    expect(matches).toHaveLength(1);
  });
});

describe('Create and add - works when multiple selections are active', () => {
  it('adds new exercise to session that already has exercises (Start workout)', () => {
    const ex1 = addExerciseToDb(`First ${Date.now()}`);
    let session = buildSessionWithExercise(null, ex1);

    const ex2 = addExerciseToDb(`Second ${Date.now()}`);
    session = buildSessionWithExercise(session, ex2);

    expect(session.exercises).toHaveLength(2);
    expect(session.exerciseOrder).toHaveLength(2);
    expect(session.exercises.map((e) => e.name)).toContain(ex1.name);
    expect(session.exercises.map((e) => e.name)).toContain(ex2.name);
  });

  it('adds new exercise to session with single exercise (Start {exercise})', () => {
    const ex = addExerciseToDb(`Solo ${Date.now()}`);
    const session = buildSessionWithExercise(null, ex);

    expect(session.exercises).toHaveLength(1);
    expect(session.exercises[0].name).toBe(ex.name);
  });
});
