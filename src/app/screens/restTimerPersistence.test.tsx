/**
 * Integration test: Rest timer persists when adding exercises during active session
 * - Complete set -> navigate to add exercises -> return -> timer still running
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Rest timer persistence when adding exercises', () => {
  beforeEach(() => {
    if (typeof localStorage.clear === 'function') localStorage.clear();
  });

  it('complete set -> navigate to add exercises -> return -> timer still visible', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    const lastSetAt = now - 30000; // 30 seconds ago

    const adHocSession = {
      id: 'session-rest-timer',
      createdAt: now,
      status: 'active' as const,
      startedAt: now,
      exerciseOrder: ['ex-1'],
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'usr:bench',
          name: 'Bench Press',
          source: 'user' as const,
          addedAt: now,
          sets: [{ id: 's1', weight: 60, reps: 10, timestamp: lastSetAt }],
          isComplete: false,
          lastSetAt,
        },
      ],
      lastSetAt,
      lastSetOwnerId: 'ex-1',
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

    // Tap Resume to enter session
    const resumeButton = await screen.findByText(/Resume/i, {}, { timeout: 3000 });
    await user.click(resumeButton);

    await waitFor(() => {
      expect(screen.getByText(/Bench Press|Logging Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Timer should show "Since last set" (format: 0:30 or similar)
    const sinceLastBefore = screen.queryByText(/Since last set/i);
    expect(sinceLastBefore).toBeInTheDocument();

    // Navigate to Add exercise (button text: "Add exercise")
    const addExerciseButton = screen.getByRole('button', { name: /Add exercise/i }) ?? screen.getByText(/Add exercise/i);
    await user.click(addExerciseButton);

    // Should show Add Exercise screen
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search exercises/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Go back without adding
    const backButton = screen.getByRole('button', { name: /Back|back/i }) ?? screen.getByText(/Back/i);
    await user.click(backButton);

    // Return to session - timer should still be visible
    await waitFor(() => {
      expect(screen.getByText(/Bench Press|Logging Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const sinceLastAfter = screen.queryByText(/Since last set/i);
    expect(sinceLastAfter).toBeInTheDocument();
  }, 10000); // Longer timeout for full navigation flow
});
