import { ReactNode, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface ExerciseSearchBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ExerciseSearchBottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: ExerciseSearchBottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleClose = () => {
    onClose();
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      handleClose();
    }

    setStartY(0);
    setCurrentY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      handleClose();
    }

    setStartY(0);
    setCurrentY(0);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, currentY, startY]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Track keyboard height using Visual Viewport API (mobile browsers)
  useEffect(() => {
    if (!isOpen) return;

    const updateKeyboardHeight = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;
        // Only consider it keyboard if difference is > 150px (keyboards are typically 200-400px)
        setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
      } else {
        // Fallback: detect keyboard via window resize (less reliable)
        const viewportHeight = window.innerHeight;
        const screenHeight = window.screen.height;
        // On mobile, when keyboard opens, innerHeight decreases significantly
        // This is a heuristic and may not work on all devices
        if (viewportHeight < screenHeight * 0.75) {
          setKeyboardHeight(screenHeight - viewportHeight);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    // Initial check
    updateKeyboardHeight();

    // Listen for viewport changes (Visual Viewport API - best for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardHeight);
      window.visualViewport.addEventListener('scroll', updateKeyboardHeight);
    }

    // Fallback: listen for window resize
    window.addEventListener('resize', updateKeyboardHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardHeight);
        window.visualViewport.removeEventListener('scroll', updateKeyboardHeight);
      }
      window.removeEventListener('resize', updateKeyboardHeight);
    };
  }, [isOpen]);

  // Dismiss keyboard when scrolling starts
  const handleScrollStart = () => {
    // Blur any active input to dismiss keyboard
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      (activeElement as HTMLElement).blur();
    }
  };

  // Handle scroll events to dismiss keyboard
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isOpen) return;

    let scrollTimer: number | null = null;
    let isScrolling = false;
    let touchStartY = 0;

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        handleScrollStart();
      }
      
      // Clear existing timer
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      // Reset scrolling flag after scroll ends
      scrollTimer = window.setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    // Listen for touch events (mobile scroll start)
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = Math.abs(touchY - touchStartY);
      
      // If user moved finger significantly, it's a scroll gesture
      if (deltaY > 5) {
        isScrolling = true;
        handleScrollStart();
      }
    };
    
    const handleTouchEnd = () => {
      setTimeout(() => {
        isScrolling = false;
      }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bg-panel border-t border-border-medium rounded-t-3xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{
          bottom: '0',
          maxHeight: '90vh',
          height: '90vh',
          transform: isDragging ? `translateY(${Math.max(0, currentY - startY)}px)` : 'translateY(0)',
        }}
      >
        {/* Drag handle */}
        <div className="w-full py-3 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-10 h-1 bg-border-medium rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content - scrollable area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}
        >
          <div 
            className="p-6 flex flex-col h-full"
            style={{
              paddingBottom: `max(calc(5rem + env(safe-area-inset-bottom, 0px)), calc(5rem + env(safe-area-inset-bottom, 0px)))`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

