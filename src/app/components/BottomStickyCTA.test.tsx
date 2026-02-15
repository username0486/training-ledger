/**
 * Tests for BottomStickyCTA layout:
 * - CTA never overlaps nav (uses layout constants)
 * - Spacing consistent across navVisible true/false
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomStickyCTA, BOTTOM_STICKY_CTA, getResultsListBottomPadding } from './BottomStickyCTA';

describe('BottomStickyCTA', () => {
  it('renders children and applies layout constants', () => {
    render(
      <BottomStickyCTA navVisible={true}>
        <button>Start workout</button>
      </BottomStickyCTA>
    );
    expect(screen.getByRole('button', { name: 'Start workout' })).toBeInTheDocument();
  });

  it('uses layout constants from BOTTOM_STICKY_CTA', () => {
    expect(BOTTOM_STICKY_CTA.globalNavHeightPx).toBe(88);
    expect(BOTTOM_STICKY_CTA.breathingRoomPx).toBe(12);
    expect(BOTTOM_STICKY_CTA.contentHeightPx).toBe(60);
  });

  it('getResultsListBottomPadding returns valid calc() for scroll padding', () => {
    const paddingNavVisible = getResultsListBottomPadding(true);
    const paddingNavHidden = getResultsListBottomPadding(false);

    expect(paddingNavVisible).toContain('calc(');
    expect(paddingNavVisible).toContain('60px');
    expect(paddingNavVisible).toContain('88px');
    expect(paddingNavVisible).toContain('env(safe-area-inset-bottom');

    expect(paddingNavHidden).toContain('calc(');
    expect(paddingNavHidden).toContain('60px');
    expect(paddingNavHidden).not.toContain('88px');
    expect(paddingNavHidden).toContain('env(safe-area-inset-bottom');
  });
});
