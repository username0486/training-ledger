/**
 * Layout constants for consistent spacing across the app.
 * Used by FullScreenSearchLayout and other screens with bottom CTAs.
 */

/** Height of the global bottom navigation bar (pill + padding). ~88px */
export const GLOBAL_NAV_HEIGHT_PX = 88;

/** Breathing room between CTA and nav/safe area. */
export const CTA_BREATHING_ROOM_PX = 36;

/** Approximate height of CTA content (button + top padding). */
export const CTA_CONTENT_HEIGHT_PX = 60;

/**
 * Bottom padding for sticky CTA when global nav is visible.
 * CTA sits above: nav + safe area + breathing room.
 */
export function getCtaBottomPaddingPx(navVisible: boolean): string {
  const safeArea = 'env(safe-area-inset-bottom, 0px)';
  if (navVisible) {
    return `calc(${GLOBAL_NAV_HEIGHT_PX}px + ${safeArea} + ${CTA_BREATHING_ROOM_PX}px)`;
  }
  return `calc(${safeArea} + ${CTA_BREATHING_ROOM_PX}px)`;
}
