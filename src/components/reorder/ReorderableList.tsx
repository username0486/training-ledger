/**
 * ReorderableList - Shared reorder component built on Pragmatic Drag and Drop (PDD).
 *
 * Pattern: PDD + Motion + React state
 * - PDD: Lightweight, framework-agnostic; handles pointer/touch/keyboard consistently.
 *   We use draggable (handle-only), dropTargetForElements, monitorForElements, and
 *   @atlaskit/pragmatic-drag-and-drop-hitbox/list-item for reorder-before/after.
 * - Motion: layout + layoutId for FLIP-style animations; spring transition for snappy feel.
 * - React state: Single source of truth. onReorder receives new array; never reorder via DOM.
 *
 * Usage: Provide items with stable IDs (getId), renderItem with dragHandleProps on the
 * handle element, and optional persistReorder for immediate persistence.
 */

import { useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachInstruction, extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { motion, AnimatePresence } from 'motion/react';
import { reorderArray } from './reorderUtils';

const DRAG_TYPE = 'reorder-item';

type DragData = { type: typeof DRAG_TYPE; itemId: string };
type DropData = { type: typeof DRAG_TYPE; itemId: string; index: number };

export interface ReorderableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (
    item: T,
    ctx: { dragHandleProps: React.HTMLAttributes<HTMLElement>; isDragging: boolean }
  ) => React.ReactNode;
  persistReorder?: (next: T[]) => void;
  disabled?: boolean;
}

export function ReorderableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  persistReorder,
  disabled = false,
}: ReorderableListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; edge: 'before' | 'after' } | null>(null);
  const itemRefs = useRef<Map<string, { el: HTMLElement; handle: HTMLElement }>>(new Map());
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  const persistRef = useRef(persistReorder);
  const getIdRef = useRef(getId);

  itemsRef.current = items;
  onReorderRef.current = onReorder;
  persistRef.current = persistReorder;
  getIdRef.current = getId;

  useEffect(() => {
    if (disabled) return;

    const cleanupFns: Array<() => void> = [];

    // Monitor for drops - single source of truth for drop handling
    cleanupFns.push(
      monitorForElements({
        onDrop: ({ source, location }) => {
          setDraggingId(null);
          setDropIndicator(null);

          const sourceData = source.data as DragData;
          if (sourceData?.type !== DRAG_TYPE) return;

          const innerMost = location.current.dropTargets[0];
          if (!innerMost) return;

          const targetData = innerMost.data as DropData;
          if (targetData?.type !== DRAG_TYPE) return;

          const instruction: Instruction | null = extractInstruction(innerMost.data);
          if (!instruction) return;

          const startId = sourceData.itemId;
          const targetId = targetData.itemId;
          if (startId === targetId) return;

          const list = itemsRef.current;
          const startIndex = list.findIndex((i) => getIdRef.current(i) === startId);
          const targetIndex = list.findIndex((i) => getIdRef.current(i) === targetId);
          if (startIndex === -1 || targetIndex === -1) return;

          const finishIndex =
            instruction.operation === 'reorder-before' ? targetIndex : targetIndex + 1;
          if (finishIndex === startIndex) return;

          const next = reorderArray(list, startIndex, finishIndex);
          onReorderRef.current(next);
          persistRef.current?.(next);
        },
      })
    );

    // Set up draggable + drop target for each item
    const entries = Array.from(itemRefs.current.entries());
    for (const [id, { el, handle }] of entries) {
      const index = itemsRef.current.findIndex((i) => getIdRef.current(i) === id);
      if (index === -1) continue;

      cleanupFns.push(
        draggable({
          element: el,
          dragHandle: handle,
          getInitialData: () => ({ type: DRAG_TYPE, itemId: id } as DragData),
          onDragStart: () => setDraggingId(id),
          onDrop: () => {
            setDraggingId(null);
            setDropIndicator(null);
          },
        })
      );

      cleanupFns.push(
        dropTargetForElements({
          element: el,
          getData: ({ input, element }) => {
            const data: DropData = { type: DRAG_TYPE, itemId: id, index };
            return attachInstruction(data, {
              input,
              element,
              operations: {
                'reorder-before': 'available',
                'reorder-after': 'available',
              },
            });
          },
          onDragEnter: () => {
            // Show drop indicator - we'll use a simple approach: show line before/after based on pointer
            setDropIndicator((prev) => (prev ? { ...prev, index } : { index, edge: 'after' }));
          },
          onDrag: ({ self }) => {
            const inst = extractInstruction(self.data);
            if (inst) {
              setDropIndicator({
                index,
                edge: inst.operation === 'reorder-before' ? 'before' : 'after',
              });
            }
          },
          onDragLeave: () => {
            setDropIndicator((prev) => (prev?.index === index ? null : prev));
          },
        })
      );
    }

    return () => cleanupFns.forEach((fn) => fn());
  }, [items, disabled]);

  // Register refs - we need to populate itemRefs when items render
  const registerRef = (id: string, el: HTMLElement | null, handle: HTMLElement | null) => {
    if (el && handle) {
      itemRefs.current.set(id, { el, handle });
    } else {
      itemRefs.current.delete(id);
    }
  };

  return (
    <ul className="list-none p-0 m-0 space-y-2">
      {items.map((item, index) => {
        const id = getId(item);
        const isDragging = draggingId === id;

        return (
          <ReorderableItem
            key={id}
            id={id}
            index={index}
            item={item}
            isDragging={isDragging}
            disabled={disabled}
            renderItem={renderItem}
            registerRef={registerRef}
            showDropBefore={dropIndicator?.index === index && dropIndicator?.edge === 'before'}
            showDropAfter={dropIndicator?.index === index && dropIndicator?.edge === 'after'}
          />
        );
      })}
    </ul>
  );
}

interface ReorderableItemProps<T> {
  id: string;
  index: number;
  item: T;
  isDragging: boolean;
  disabled: boolean;
  renderItem: (
    item: T,
    ctx: { dragHandleProps: React.HTMLAttributes<HTMLElement>; isDragging: boolean }
  ) => React.ReactNode;
  registerRef: (id: string, el: HTMLElement | null, handle: HTMLElement | null) => void;
  showDropBefore: boolean;
  showDropAfter: boolean;
}

function ReorderableItem<T>({
  id,
  item,
  isDragging,
  disabled,
  renderItem,
  registerRef,
  showDropBefore,
  showDropAfter,
}: ReorderableItemProps<T>) {
  const elRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(id, elRef.current, handleRef.current);
    return () => registerRef(id, null, null);
  }, [id, registerRef]);

  const dragHandleProps = {
    ref: handleRef,
    'data-drag-handle': true,
    className: 'cursor-grab active:cursor-grabbing touch-none select-none',
    style: { WebkitTouchCallout: 'none' as const, userSelect: 'none' as const },
  };

  return (
    <motion.li
      ref={elRef}
      layout
      layoutId={id}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      initial={false}
      className="relative"
      style={{
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 10 : 0,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      <AnimatePresence>
        {showDropBefore && (
          <motion.div
            key="drop-before"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 h-0.5 bg-accent rounded-full z-20"
            style={{ top: -4 }}
          />
        )}
      </AnimatePresence>
      {renderItem(item, { dragHandleProps: disabled ? {} : dragHandleProps, isDragging })}
      <AnimatePresence>
        {showDropAfter && (
          <motion.div
            key="drop-after"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 h-0.5 bg-accent rounded-full z-20"
            style={{ bottom: -4 }}
          />
        )}
      </AnimatePresence>
    </motion.li>
  );
}
