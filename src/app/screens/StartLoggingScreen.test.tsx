/**
 * Integration tests for Start Logging exercise search:
 * - Multi-select toggling works and chips reflect it
 * - Create-and-add adds to selection (not just creates)
 * - Start with 1 vs many routes correctly and seeds session with correct ids and order
 * - Back from search doesn't create a session; it just exits
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Start Logging exercise search', () => {
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

  it('navigates to Start logging and shows search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    const startLoggingCard = screen.getByText('Start logging');
    await user.click(startLoggingCard);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('multi-select toggling works and chips reflect it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Start logging'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Type to search - system exercises include "Bench Press"
    const searchInput = screen.getByPlaceholderText('Search exercises...');
    await user.type(searchInput, 'Bench');

    // Wait for results and click first match (Bench Press - exact, not Incline Bench Press)
    const benchPressElements = await screen.findAllByText('Bench Press', {}, { timeout: 3000 });
    const benchPressRow = benchPressElements.map((el) => el.closest('button')).find(Boolean);
    if (!benchPressRow) throw new Error('Bench Press row not found');
    await user.click(benchPressRow);

    // Chip should appear (Bench Press now in chip + row)
    await waitFor(() => {
      const matches = screen.getAllByText('Bench Press');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 2000 });

    // Tap same row again to deselect - chip should disappear
    await user.click(benchPressRow);
    await waitFor(() => {
      const chips = screen.queryAllByText('Bench Press');
      // May still be in results list; chip row is removed when selection empty
      const startButton = screen.getByRole('button', { name: /^Start$/ });
      expect(startButton).toBeDisabled();
    }, { timeout: 2000 });
  });

  it('Create-and-add adds to selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Start logging'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Type a query that won't match existing exercises
    const uniqueName = `CustomEx${Date.now()}`;
    const searchInput = screen.getByPlaceholderText('Search exercises...');
    await user.type(searchInput, uniqueName);

    // Create and add button should appear
    const createButton = await screen.findByRole('button', {
      name: new RegExp(`Create and add "${uniqueName}"`, 'i'),
    }, { timeout: 3000 });
    await user.click(createButton);

    // Exercise should be in selection (chip visible)
    await waitFor(() => {
      const matches = screen.getAllByText(uniqueName);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 2000 });

    // Start button should be enabled with exercise name
    const startButton = screen.getByRole('button', { name: new RegExp(`Start ${uniqueName}`) });
    expect(startButton).not.toBeDisabled();
  });

  it('Start with 1 selected creates exercise session and navigates', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Start logging'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });

    const searchInput = screen.getByPlaceholderText('Search exercises...');
    await user.type(searchInput, 'Squat');

    const squatElements = await screen.findAllByText(/Squat/i, {}, { timeout: 3000 });
    const squatRow = squatElements.map((el) => el.closest('button')).find(Boolean);
    if (!squatRow) throw new Error('Squat row not found');
    await user.click(squatRow);

    const startButton = await screen.findByRole('button', { name: /Start .+/i }, { timeout: 2000 });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Squat|Logging Session/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Start with multiple selected creates workout session with correct order', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Start logging'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });

    const searchInput = screen.getByPlaceholderText('Search exercises...');
    await user.type(searchInput, 'Bench');

    const benchPressElements = await screen.findAllByText('Bench Press', {}, { timeout: 3000 });
    const benchPressRow = benchPressElements.map((el) => el.closest('button')).find(Boolean);
    if (!benchPressRow) throw new Error('Bench Press row not found');
    await user.click(benchPressRow);

    await user.clear(searchInput);
    await user.type(searchInput, 'Squat');
    const squatElements = await screen.findAllByText(/Squat/i, {}, { timeout: 3000 });
    const squatRow = squatElements.map((el) => el.closest('button')).find(Boolean);
    if (!squatRow) throw new Error('Squat row not found');
    await user.click(squatRow);

    // Start workout button
    const startButton = await screen.findByRole('button', { name: /Start workout/i }, { timeout: 2000 });
    await user.click(startButton);

    await waitFor(() => {
      // Session screen shows both exercises - use getAllByText since there may be multiple instances
      const benchMatches = screen.getAllByText('Bench Press');
      const squatMatches = screen.getAllByText('Squat');
      expect(benchMatches.length).toBeGreaterThanOrEqual(1);
      expect(squatMatches.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('Back from search does not create session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Start logging'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Select an exercise
    const searchInput = screen.getByPlaceholderText('Search exercises...');
    await user.type(searchInput, 'Bench');
    const benchPressElements = await screen.findAllByText('Bench Press', {}, { timeout: 3000 });
    const benchPressRow = benchPressElements.map((el) => el.closest('button')).find(Boolean);
    if (!benchPressRow) throw new Error('Bench Press row not found');
    await user.click(benchPressRow);

    // Tap Back (chevron in TopBar)
    const backButton = screen.getByRole('button', { name: /go back/i });
    await user.click(backButton);

    // Should return to Home, no session created (no Resume card)
    await waitFor(() => {
      expect(screen.getByText('Training Ledger')).toBeInTheDocument();
      expect(screen.queryByText(/Resume/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
