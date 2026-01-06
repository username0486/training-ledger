import { ReactNode, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface ExerciseSearchBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onScrollStart?: () => void; // Callback to dismiss keyboard
}

export function ExerciseSearchBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  onScrollStart,
}: ExerciseSearchBottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleDragTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleDragTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleClose = () => {
    onClose();
  };

  const handleDragTouchEnd = () => {
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

  // Handle keyboard visibility and height for mobile
  useEffect(() => {
    if (!isOpen) return;

    const updateKeyboardHeight = () => {
      // Use Visual Viewport API if available (modern mobile browsers)
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;
        // Only consider it a keyboard if the difference is significant (>150px)
        setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
      } else {
        // Fallback: detect keyboard via window resize (less reliable)
        const initialHeight = window.innerHeight;
        const handleResize = () => {
          const currentHeight = window.innerHeight;
          const heightDiff = initialHeight - currentHeight;
          setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }
    };

    // Initial check
    updateKeyboardHeight();

    // Listen to visual viewport changes (mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardHeight);
      return () => {
        window.visualViewport?.removeEventListener('resize', updateKeyboardHeight);
      };
    }
  }, [isOpen]);

  // Handle scroll events to dismiss keyboard
  const handleScrollStart = () => {
    if (onScrollStart) {
      onScrollStart();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Dismiss keyboard when user starts scrolling
    if (e.currentTarget.scrollTop > 0 && onScrollStart) {
      handleScrollStart();
    }
  };

  const handleScrollTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Track if this is a scroll gesture vs tap
    const touch = e.touches[0];
    const startScrollTop = scrollContainerRef.current?.scrollTop || 0;
    
    const handleScrollTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      const deltaY = Math.abs(moveTouch.clientY - touch.clientY);
      
      // If user is dragging/scrolling (not just tapping), dismiss keyboard
      if (deltaY > 5) {
        handleScrollStart();
        document.removeEventListener('touchmove', handleScrollTouchMove);
      }
    };

    document.addEventListener('touchmove', handleScrollTouchMove, { passive: true });
    
    // Clean up after touch ends
    const handleScrollTouchEnd = () => {
      document.removeEventListener('touchmove', handleScrollTouchMove);
      document.removeEventListener('touchend', handleScrollTouchEnd);
    };
    document.addEventListener('touchend', handleScrollTouchEnd, { once: true });
  };

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
          onTouchStart={handleDragTouchStart}
          onTouchMove={handleDragTouchMove}
          onTouchEnd={handleDragTouchEnd}
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
          onScroll={handleScroll}
          onTouchStart={handleScrollTouchStart}
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}
        >
          <div className="p-6 pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

