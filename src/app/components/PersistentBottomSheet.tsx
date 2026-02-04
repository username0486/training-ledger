import { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PersistentBottomSheetProps {
  children: ReactNode | ((isExpanded: boolean) => ReactNode);
  peekContent?: ReactNode;
  defaultExpanded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function PersistentBottomSheet({
  children,
  peekContent,
  defaultExpanded = false,
  isOpen = true,
  onClose,
}: PersistentBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Close sheet when isOpen becomes false
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

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
    setIsExpanded(false);
    if (onClose) {
      setTimeout(() => onClose(), 300);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    const threshold = 50;

    if (deltaY > threshold && isExpanded) {
      handleClose();
    } else if (deltaY < -threshold && !isExpanded) {
      setIsExpanded(true);
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

    if (deltaY > threshold && isExpanded) {
      setIsExpanded(false);
      if (onClose) {
        // Small delay to allow animation to complete
        setTimeout(() => onClose(), 300);
      }
    } else if (deltaY < -threshold && !isExpanded) {
      setIsExpanded(true);
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
  }, [isDragging, currentY]);

  // Click outside to close
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={handleClose}
        />
      )}
      
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bg-panel border-t border-border-medium rounded-t-3xl shadow-2xl transition-all duration-500 ease-in-out z-50 ${
          isExpanded ? 'max-h-[80vh]' : 'h-auto min-h-[90px] max-h-[150px]'
        }`}
        style={{
          bottom: '0',
          transform: isDragging ? `translateY(${Math.max(0, currentY - startY)}px)` : 'translateY(0)',
        }}
      >
        {/* Drag handle */}
        <button
          className="w-full py-3 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (isExpanded) {
              handleClose();
            } else {
              setIsExpanded(true);
            }
          }}
        >
          <div className="w-10 h-1 bg-border-medium rounded-full mb-2" />
          <div className="flex items-center gap-2">
            {!isExpanded && peekContent && (
              <div className="text-base text-text-muted">{peekContent}</div>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </button>

        {/* Content */}
        <div 
          className={`px-5 transition-opacity duration-300 ${isExpanded ? 'overflow-y-auto max-h-[calc(80vh-80px)] opacity-100' : 'overflow-hidden opacity-100'}`}
          style={{
            paddingBottom: `max(calc(5rem + env(safe-area-inset-bottom, 0px)), calc(5rem + env(safe-area-inset-bottom, 0px)))`,
          }}
        >
          {typeof children === 'function' ? children(isExpanded) : children}
        </div>
      </div>
    </>
  );
}