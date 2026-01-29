import { ReactNode, useRef, useEffect } from 'react';
import { SessionItem } from '../utils/exerciseGrouping';

interface SessionScrollLayoutProps {
  items: SessionItem[];
  activeItemId: string | null;
  onSetActiveItem: (itemId: string) => void;
  renderActiveItem: (item: SessionItem) => ReactNode;
  renderInactiveItem: (item: SessionItem) => ReactNode;
  renderControlsSection?: () => ReactNode;
  className?: string;
}

/**
 * Scroll-based session layout component
 * Renders all session items in a single scrollable list
 * Only the active item shows full controls
 * Automatically scrolls active card to top when activated
 */
export function SessionScrollLayout({
  items,
  activeItemId,
  onSetActiveItem,
  renderActiveItem,
  renderInactiveItem,
  renderControlsSection,
  className = '',
}: SessionScrollLayoutProps) {
  // Refs for each card container keyed by itemId
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track last active item ID to prevent repeated scrolling
  const lastScrolledActiveId = useRef<string | null>(null);
  // Ref to the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Function to set ref for an item
  const setItemRef = (itemId: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
    } else {
      itemRefs.current.delete(itemId);
    }
  };

  // Header offset constant
  // Account for header height + padding to match spacing between cards (space-y-4 = 16px)
  // TopBar has py-4 (16px top/bottom) + content height (~24px) = ~56px total
  // We want spacing matching space-y-4 (16px) between header and card
  // Total offset = header height + card spacing = 56 + 16 = 72px
  // Using slightly more (80px) to ensure card is fully visible with comfortable spacing
  const HEADER_OFFSET_PX = 64; // Header height (TopBar py-4 + content)
  const CARD_SPACING_PX = 16; // Matches space-y-4 between cards

  // Scroll active card into safe view (below header) when activeItemId changes
  // Always scrolls on activation (tap or auto-advance) to ensure focus
  useEffect(() => {
    if (!activeItemId) return;

    // Prevent repeated scrolling for the same activation
    if (lastScrolledActiveId.current === activeItemId) return;

    // Helper function to scroll card to header-safe top position
    const scrollCardToHeaderSafeTop = () => {
      const currentElement = itemRefs.current.get(activeItemId);
      const currentScrollContainer = scrollContainerRef.current;
      
      if (!currentElement || !currentScrollContainer) return;

      // Manual scroll with offset for reliability
      const containerRect = currentScrollContainer.getBoundingClientRect();
      const elementRect = currentElement.getBoundingClientRect();
      
      // Calculate target scroll position
      // elementRect.top is relative to viewport
      // containerRect.top is container's position relative to viewport
      // currentScrollContainer.scrollTop is current scroll position
      // 
      // The element's document position = currentScrollContainer.scrollTop + (elementRect.top - containerRect.top)
      // We want: element's top to be at (HEADER_OFFSET_PX + CARD_SPACING_PX) from container's top after scroll
      // This ensures proper spacing matching the gap between cards
      const elementTopRelativeToContainer = elementRect.top - containerRect.top;
      const currentScrollTop = currentScrollContainer.scrollTop;
      const targetScrollTop = currentScrollTop + elementTopRelativeToContainer - HEADER_OFFSET_PX - CARD_SPACING_PX;
      
      currentScrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop), // Ensure non-negative
        behavior: 'smooth',
      });

      lastScrolledActiveId.current = activeItemId;
    };

    // Use double requestAnimationFrame to ensure the card has expanded before scrolling
    // First frame: wait for React to render the expanded card
    requestAnimationFrame(() => {
      // Second frame: ensure DOM layout is complete, then scroll
      requestAnimationFrame(() => {
        scrollCardToHeaderSafeTop();
      });
    });
  }, [activeItemId]);

  return (
    <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto ${className}`}>
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          
          if (isActive) {
            return (
              <div
                key={item.id}
                ref={(el) => setItemRef(item.id, el)}
                className="scroll-mt-[80px]"
              >
                {renderActiveItem(item)}
              </div>
            );
          }
          
          return (
            <div
              key={item.id}
              ref={(el) => setItemRef(item.id, el)}
              onClick={() => onSetActiveItem(item.id)}
              className="cursor-pointer scroll-mt-[30px]"
            >
              {renderInactiveItem(item)}
            </div>
          );
        })}
        
        {/* Workout controls section - always available after last item */}
        {renderControlsSection && (
          <div className="pt-4">
            {renderControlsSection()}
          </div>
        )}
        
        {/* Tail spacer to allow last card to scroll to top */}
        <div className="min-h-[70vh]" aria-hidden="true" />
      </div>
    </div>
  );
}
