import { ReactNode } from 'react';
import {
  GLOBAL_NAV_HEIGHT_PX,
  CTA_BREATHING_ROOM_PX,
  CTA_CONTENT_HEIGHT_PX,
  getCtaBottomPaddingPx,
} from '../constants/layout';

export const BOTTOM_STICKY_CTA = {
  /** Height of CTA content area (button + padding) for scroll padding calculations. */
  contentHeightPx: CTA_CONTENT_HEIGHT_PX,
  /** Breathing room between CTA and nav/safe area (8–16px range). */
  breathingRoomPx: CTA_BREATHING_ROOM_PX,
  /** Global nav height from layout system. */
  globalNavHeightPx: GLOBAL_NAV_HEIGHT_PX,
} as const;

interface BottomStickyCTAProps {
  children: ReactNode;
  /**
   * Whether the global bottom navigation is visible.
   * When true: bottomSpacing = globalNavHeight + safeAreaInsetBottom + breathingRoom
   * When false: bottomSpacing = safeAreaInsetBottom + breathingRoom
   */
  navVisible?: boolean;
  /** Optional additional class names for the container. */
  className?: string;
}

/**
 * Reusable sticky bottom CTA container.
 * Positions content above the global nav with consistent spacing.
 * Uses layout constants (no magic numbers).
 */
export function BottomStickyCTA({
  children,
  navVisible = false,
  className = '',
}: BottomStickyCTAProps) {
  const bottomSpacing = getCtaBottomPaddingPx(navVisible);

  return (
    <div
      className={`flex-shrink-0 px-5 pt-4 border-t border-border-subtle bg-panel ${className}`.trim()}
      style={{ paddingBottom: bottomSpacing }}
    >
      {children}
    </div>
  );
}

/**
 * Returns the padding-bottom value for a scrollable results list
 * so content never scrolls under the CTA.
 * Use: style={{ paddingBottom: getResultsListBottomPadding(navVisible) }}
 */
export function getResultsListBottomPadding(navVisible: boolean): string {
  const ctaBottomSpacing = getCtaBottomPaddingPx(navVisible);
  return `calc(${CTA_CONTENT_HEIGHT_PX}px + ${ctaBottomSpacing})`;
}
