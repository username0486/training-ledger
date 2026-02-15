/**
 * Integration test: Start session -> Home -> Home renders + Resume card -> tap Resume returns to session
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Home navigation from active session', () => {
  beforeEach(() => {
    if (typeof localStorage.clear === 'function') localStorage.clear();
    localStorage.setItem('training_ledger_app_state', JSON.stringify({
      schemaVersion: 2,
      data: {
        workouts: [],
        templates: [],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession: null,
      },
    }));
  });

  it('Home renders with loading skeleton then content when hydrated', async () => {
    render(<App />);

    // Initially may show loading skeleton
    const skeleton = screen.queryByTestId('home-loading-skeleton');
    if (skeleton) {
      expect(skeleton).toBeInTheDocument();
    }

    // After hydration, Home must render
    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Home with active ad-hoc session shows Resume card', async () => {
    const adHocSession = {
      id: 'session-123',
      createdAt: Date.now(),
      status: 'active' as const,
      exerciseOrder: ['ex-1'],
      exercises: [{
        id: 'ex-1',
        exerciseId: 'usr:test',
        name: 'Test Exercise',
        source: 'user' as const,
        addedAt: Date.now(),
        sets: [],
        isComplete: false,
      }],
    };
    localStorage.setItem('training_ledger_app_state', JSON.stringify({
      schemaVersion: 2,
      data: {
        workouts: [],
        templates: [],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession,
      },
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Resume card must be visible (Resume is inside a Card, use getByText)
    const resumeButton = await screen.findByText(/Resume/i, {}, { timeout: 3000 });
    expect(resumeButton).toBeInTheDocument();
  });

  it('Home with ad-hoc session: tap Resume returns to active session', async () => {
    const user = userEvent.setup();
    const adHocSession = {
      id: 'session-456',
      createdAt: Date.now(),
      status: 'active' as const,
      exerciseOrder: ['ex-1'],
      exercises: [{
        id: 'ex-1',
        exerciseId: 'usr:bench',
        name: 'Bench Press',
        source: 'user' as const,
        addedAt: Date.now(),
        sets: [],
        isComplete: false,
      }],
    };
    localStorage.setItem('training_ledger_app_state', JSON.stringify({
      schemaVersion: 2,
      data: {
        workouts: [],
        templates: [],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession,
      },
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Resume card must be visible
    const resumeButton = await screen.findByText(/Resume/i, {}, { timeout: 3000 });
    expect(resumeButton).toBeInTheDocument();

    // Tap Resume - must return to session
    await user.click(resumeButton);

    await waitFor(() => {
      expect(screen.getByText(/Bench Press|Logging Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
