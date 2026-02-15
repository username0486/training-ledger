import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { WorkoutTemplate } from '../types/templates';

const REVEAL_THRESHOLD = 60; // px - swipe past this to reveal Delete button
const FULL_SWIPE_THRESHOLD_RATIO = 0.5; // 50% of row width = full swipe
const FAST_VELOCITY_THRESHOLD = 0.4; // px/ms - above this = fast swipe
const DELETE_BUTTON_WIDTH = 80;

interface SwipeableSavedWorkoutRowProps {
  template: WorkoutTemplate;
  onViewTemplate: (templateId: string) => void;
  onStartTemplate: (templateId: string) => void;
  onRequestDelete: (template: WorkoutTemplate) => void;
  resetTrigger?: number; // when this changes, close the row (e.g. when modal cancelled)
}

export function SwipeableSavedWorkoutRow({
  template,
  onViewTemplate,
  onStartTemplate,
  onRequestDelete,
  resetTrigger = 0,
}: SwipeableSavedWorkoutRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastMoveRef = useRef<{ x: number; time: number } | null>(null);
  const rowWidthRef = useRef<number>(0);

  // When modal closes (Cancel), parent increments resetTrigger; close the row
  useEffect(() => {
    if (resetTrigger > 0) {
      setTranslateX(0);
      setIsRevealed(false);
    }
  }, [resetTrigger]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !lastMoveRef.current) return;

    const deltaX = lastMoveRef.current.x - touchStartRef.current.x;
    const duration = lastMoveRef.current.time - touchStartRef.current.time;
    const velocity = duration > 0 ? Math.abs(deltaX) / duration : 0;
    const rowWidth = rowWidthRef.current || 300;
    const fullSwipeThreshold = rowWidth * FULL_SWIPE_THRESHOLD_RATIO;

    // Fast swipe left → open modal immediately
    if (deltaX < 0 && velocity > FAST_VELOCITY_THRESHOLD) {
      setTranslateX(0);
      setIsRevealed(false);
      setIsDragging(false);
      onRequestDelete(template);
      touchStartRef.current = null;
      lastMoveRef.current = null;
      return;
    }

    // Full swipe (distance) → open modal immediately
    if (deltaX < -fullSwipeThreshold) {
      setTranslateX(0);
      setIsRevealed(false);
      setIsDragging(false);
      onRequestDelete(template);
      touchStartRef.current = null;
      lastMoveRef.current = null;
      return;
    }

    // Slow/partial swipe: reveal or close
    if (deltaX < -REVEAL_THRESHOLD) {
      setTranslateX(-DELETE_BUTTON_WIDTH);
      setIsRevealed(true);
    } else {
      setTranslateX(0);
      setIsRevealed(false);
    }

    touchStartRef.current = null;
    lastMoveRef.current = null;
    setIsDragging(false);
  }, [template, onRequestDelete]);

  // Global mouse listeners for drag-outside-element
  useEffect(() => {
    if (!isMouseDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!touchStartRef.current) return;
      const x = e.clientX;
      const deltaX = x - touchStartRef.current.x;
      lastMoveRef.current = { x, time: Date.now() };

      if (deltaX < 0) {
        const maxSwipe = -Math.min(DELETE_BUTTON_WIDTH + 40, rowWidthRef.current * FULL_SWIPE_THRESHOLD_RATIO);
        setTranslateX(Math.max(deltaX, maxSwipe));
      } else if (isRevealed && deltaX > 0) {
        setTranslateX(Math.min(0, deltaX - DELETE_BUTTON_WIDTH));
      }
    };
    const onMouseUp = () => {
      setIsMouseDragging(false);
      setIsDragging(false);
      handleTouchEnd();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isMouseDragging, isRevealed, handleTouchEnd]);

  const startGesture = (clientX: number, clientY: number) => {
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    lastMoveRef.current = { x: clientX, time: Date.now() };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    rowWidthRef.current = (e.currentTarget as HTMLElement).offsetWidth;
    startGesture(e.touches[0].clientX, e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    rowWidthRef.current = (e.currentTarget as HTMLElement).offsetWidth;
    startGesture(e.clientX, e.clientY);
    setIsMouseDragging(true);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const x = e.touches[0].clientX;
    const deltaX = x - touchStartRef.current.x;
    lastMoveRef.current = { x, time: Date.now() };

    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      const maxSwipe = -Math.min(DELETE_BUTTON_WIDTH + 40, rowWidthRef.current * FULL_SWIPE_THRESHOLD_RATIO);
      setTranslateX(Math.max(deltaX, maxSwipe));
    } else if (isRevealed && deltaX > 0) {
      // Allow right swipe to close when revealed
      setTranslateX(Math.min(0, deltaX - DELETE_BUTTON_WIDTH));
    }
  };

  const handleMouseUp = () => {
    if (isMouseDragging) {
      setIsMouseDragging(false);
      setIsDragging(false);
      handleTouchEnd();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(template);
  };

  const handleRowClick = () => {
    if (isRevealed) {
      setTranslateX(0);
      setIsRevealed(false);
    } else {
      onViewTemplate(template.id);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ touchAction: 'pan-y' }}
      data-swipe-row={template.id}
    >
      {/* Delete action behind */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-danger rounded-r-xl"
        style={{ width: DELETE_BUTTON_WIDTH }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-white hover:bg-danger/90 active:bg-danger/80 transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </div>

      {/* Sliding content - opaque bg so delete button doesn't show through */}
      <div
        className="relative bg-panel rounded-xl"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 150ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Card gradient className="group" onClick={handleRowClick}>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="mb-0.5 truncate">{template.name}</h3>
              <p className="text-text-muted">
                {template.exerciseNames.length} {template.exerciseNames.length === 1 ? 'exercise' : 'exercises'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartTemplate(template.id);
              }}
            >
              <Play className="w-4 h-4 mr-1.5 inline" />
              Record
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
