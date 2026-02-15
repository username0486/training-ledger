import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomStickyCTA, getResultsListBottomPadding } from './BottomStickyCTA';

interface FullScreenSearchLayoutProps {
  title: string;
  onBack: () => void;
  searchInput: ReactNode;
  /** Optional chips row (e.g. selected exercises). Rendered only when provided. */
  chipsRow?: ReactNode;
  /** Scrollable results area */
  results: ReactNode;
  /** Sticky bottom CTA (button or action area). Optional - when absent, no CTA section. */
  bottomCta?: ReactNode;
  /** Whether global nav is visible (affects CTA bottom padding). Pass true when nav is shown. */
  navVisible?: boolean;
}

/**
 * Reusable full-screen search layout.
 * - Top bar with Back
 * - Pinned search input
 * - Optional chips row
 * - Scrollable results (with bottom padding so content doesn't hide under CTA)
 * - Sticky bottom CTA via BottomStickyCTA (safe area + nav padding)
 */
export function FullScreenSearchLayout({
  title,
  onBack,
  searchInput,
  chipsRow,
  results,
  bottomCta,
  navVisible = false,
}: FullScreenSearchLayoutProps) {
  const resultsPaddingBottom = bottomCta ? getResultsListBottomPadding(navVisible) : undefined;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-panel">
      <TopBar title={title} onBack={onBack} hideBorder />

      <div className="flex flex-col flex-1 min-h-0">
        {/* Search bar - pinned at top */}
        <div className="flex-shrink-0 px-5 pb-4 border-b border-border-subtle">
          {searchInput}
        </div>

        {/* Optional chips row */}
        {chipsRow && (
          <div className="flex-shrink-0 border-b border-border-subtle">
            {chipsRow}
          </div>
        )}

        {/* Scrollable results - padding at bottom when CTA present */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-5 py-4"
          style={resultsPaddingBottom ? { paddingBottom: resultsPaddingBottom } : undefined}
        >
          {results}
        </div>

        {/* Sticky bottom CTA (optional) */}
        {bottomCta && (
          <BottomStickyCTA navVisible={navVisible}>
            {bottomCta}
          </BottomStickyCTA>
        )}
      </div>
    </div>
  );
}
