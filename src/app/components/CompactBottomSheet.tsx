import { ReactNode, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface CompactBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Compact slide-up bottom sheet that sizes to content height only
 * Used for overflow action menus
 */
export function CompactBottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: CompactBottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold) {
      onClose();
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
      onClose();
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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bg-panel border-t border-border-medium rounded-t-3xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300"
        style={{
          bottom: '0',
          maxHeight: '80vh',
          transform: isDragging ? `translateY(${Math.max(0, currentY - startY)}px)` : 'translateY(0)',
        }}
      >
        {/* Drag handle */}
        <div 
          className="w-full py-3 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-10 h-1 bg-border-medium rounded-full" />
        </div>

        {/* Content - auto-sized to content height */}
        <div 
          ref={contentRef}
          className="px-6 pb-6"
          style={{
            paddingBottom: 'max(1.5rem, 0px)',
          }}
        >
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-surface transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
