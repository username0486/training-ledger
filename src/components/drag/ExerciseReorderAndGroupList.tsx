/**
 * ExerciseReorderAndGroupList - PDD-based reorder + group (combine) for exercise lists.
 *
 * - Reorder: drag handle to reorder; insertion line at edges.
 * - Group: drag onto center zone of another exercise to create group (when enableGrouping).
 * - 200ms hover delay before merge activates.
 * - Motion layout animations.
 */

import { useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import {
  type ExerciseItem,
  type GroupItem,
  type ItemLocation,
  type SessionListItem,
  findItemLocation,
  getItemById,
  removeItem,
  insertItem,
  reorderWithinContainer,
  createGroupFromTwoExercises,
  addExerciseToGroup,
  pullChildOutOfGroup,
} from './exerciseDnDUtils';

const DRAG_TYPE = 'exercise-dnd';

type DragData = {
  type: typeof DRAG_TYPE;
  itemId: string;
  itemType: 'exercise' | 'group';
  fromContainer: 'root' | string;
};
type DropData = {
  type: typeof DRAG_TYPE;
  itemId: string;
  itemType: 'exercise' | 'group';
  index: number;
  groupId?: string;
  fromContainer: 'root' | string;
  dropIntent?: { intent: 'reorder' | 'merge'; edge: 'top' | 'bottom' | null };
  mergeReady?: boolean;
};

const MERGE_HOVER_DELAY_MS = 200;

function getDropIntent(targetEl: HTMLElement, clientY: number): { intent: 'reorder' | 'merge'; edge: 'top' | 'bottom' | null } {
  const rect = targetEl.getBoundingClientRect();
  const y = clientY - rect.top;
  const h = rect.height;
  const edgeThreshold = h * 0.25;
  if (y < edgeThreshold) return { intent: 'reorder', edge: 'top' };
  if (y > h - edgeThreshold) return { intent: 'reorder', edge: 'bottom' };
  return { intent: 'merge', edge: null };
}

/** When source is group, force reorder intent (no merge). Map center zone to edge by y position. */
function coercIntentForGroupSource(
  intent: { intent: 'reorder' | 'merge'; edge: 'top' | 'bottom' | null },
  element: HTMLElement,
  clientY: number
): { intent: 'reorder'; edge: 'top' | 'bottom' } {
  if (intent.intent === 'reorder' && intent.edge) return { intent: 'reorder', edge: intent.edge };
  const rect = element.getBoundingClientRect();
  const y = clientY - rect.top;
  const h = rect.height;
  return { intent: 'reorder', edge: y < h * 0.5 ? 'top' : 'bottom' };
}

export type ExerciseRowContext = {
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
  isDragging: boolean;
};

export type GroupRowContext = {
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
  isDragging: boolean;
};

export interface ExerciseReorderAndGroupListProps {
  items: SessionListItem[];
  onChange: (next: SessionListItem[]) => void;
  persistChange?: (next: SessionListItem[]) => void;
  renderExerciseRow: (exercise: ExerciseItem, ctx: ExerciseRowContext) => React.ReactNode;
  renderGroupRow: (group: GroupItem, ctx: GroupRowContext, slots: { children: React.ReactNode }) => React.ReactNode;
  renderGroupChild?: (child: ExerciseItem, ctx: ExerciseRowContext & { onRemoveFromGroup: () => void }) => React.ReactNode;
  enableGrouping?: boolean;
  disabled?: boolean;
}

export function ExerciseReorderAndGroupList({
  items,
  onChange,
  persistChange,
  renderExerciseRow,
  renderGroupRow,
  renderGroupChild,
  enableGrouping = false,
  disabled = false,
}: ExerciseReorderAndGroupListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<{
    targetId: string;
    edge: 'before' | 'after';
    intent: 'reorder' | 'merge';
  } | null>(null);
  const [mergeReady, setMergeReady] = useState(false);
  const mergeZoneEnteredAtRef = useRef<number | null>(null);
  const dropIntentRef = useRef<{
    overId: string | null;
    intent: 'reorder' | 'merge' | null;
    edge: 'top' | 'bottom' | null;
    mergeReady: boolean;
  }>({ overId: null, intent: null, edge: null, mergeReady: false });
  const itemRefs = useRef<Map<string, { el: HTMLElement; handle: HTMLElement }>>(new Map());
  const itemsRef = useRef(items);
  const onChangeRef = useRef(onChange);
  const persistRef = useRef(persistChange);

  itemsRef.current = items;
  onChangeRef.current = onChange;
  persistRef.current = persistChange;

  const clearMergeZone = () => {
    mergeZoneEnteredAtRef.current = null;
    setMergeReady(false);
  };

  useEffect(() => {
    if (disabled) return;

    const cleanupFns: Array<() => void> = [];

    cleanupFns.push(
      monitorForElements({
        onDrop: ({ source, location }) => {
          setDraggingId(null);
          setDropState(null);
          clearMergeZone();

          const sourceData = source.data as DragData;
          if (sourceData?.type !== DRAG_TYPE) return;

          const innerMost = location.current.dropTargets[0];
          if (!innerMost) return;

          const targetData = innerMost.data as DropData;
          if (targetData?.type !== DRAG_TYPE) return;

          const intent = dropIntentRef.current;
          let targetId = targetData.itemId;
          const startId = sourceData.itemId;
          if (startId === targetId) return;

          const list = itemsRef.current;
          const draggedItem = getItemById(list, startId);
          let targetItem = getItemById(list, targetId);
          if (!draggedItem || !targetItem) return;

          const sourceIsGroup = sourceData.itemType === 'group';
          const sourceFromGroup = sourceData.fromContainer !== 'root';
          let targetFromRoot = targetData.fromContainer === 'root';

          // When dragging a group, if we dropped on a group child, map to parent group's root position
          if (sourceIsGroup && !targetFromRoot) {
            const childLoc = findItemLocation(list, targetId);
            if (childLoc && childLoc.container !== 'root') {
              const group = list.find((i) => i.type === 'group' && i.id === childLoc.groupId);
              if (group) {
                targetId = group.id;
                targetItem = group as GroupItem;
                targetFromRoot = true;
              }
            }
          }

          const targetFromGroup = targetData.fromContainer !== 'root';
          const sameGroup = sourceFromGroup && targetFromGroup && sourceData.fromContainer === targetData.fromContainer;
          const isMerge =
            !sourceIsGroup &&
            enableGrouping &&
            intent.intent === 'merge' &&
            intent.mergeReady &&
            !sameGroup;

          if (isMerge) {
            if (draggedItem.type === 'group') return;
            if (targetItem.type === 'group') {
              const draggedLoc = findItemLocation(list, startId);
              if (!draggedLoc) return;
              const group = targetItem as GroupItem;
              const insertIdx = group.children.length;
              const next = addExerciseToGroup(list, draggedLoc, group.id, draggedItem as ExerciseItem, insertIdx);
              onChangeRef.current(next);
              persistRef.current?.(next);
              toast('Grouped exercises', { action: { label: 'Undo', onClick: () => onChangeRef.current(list) } });
            } else {
              const draggedLoc = findItemLocation(list, startId);
              if (!draggedLoc) return;
              const { nextItems } = removeItem(list, draggedLoc);
              const targetIdx = nextItems.findIndex(
                (i) => (i.type === 'exercise' && i.id === targetId) || (i.type === 'group' && i.id === targetId)
              );
              if (targetIdx === -1) return;
              const next = createGroupFromTwoExercises(nextItems, targetIdx, draggedItem as ExerciseItem, targetItem as ExerciseItem);
              onChangeRef.current(next);
              persistRef.current?.(next);
              toast('Grouped exercises', { action: { label: 'Undo', onClick: () => onChangeRef.current(list) } });
            }
          } else {
            const edge = intent.edge;
            if (edge !== 'top' && edge !== 'bottom') return;

            const draggedLoc = findItemLocation(list, startId);
            let targetLoc = findItemLocation(list, targetId);
            if (!draggedLoc || !targetLoc) return;

            // targetId may have been remapped to parent group when source is group
            const fromRoot = sourceData.fromContainer === 'root';
            const targetFromRoot = targetData.fromContainer === 'root';

            const startIdx = draggedLoc.index;
            const targetIdx = targetLoc.index;
            const op = edge === 'top' ? 'reorder-before' : 'reorder-after';
            const insertRootIndex = op === 'reorder-before' ? targetIdx : targetIdx + 1;

            if (!fromRoot && targetFromRoot) {
              const next = pullChildOutOfGroup(list, draggedLoc.groupId!, startId, insertRootIndex);
              onChangeRef.current(next);
              persistRef.current?.(next);
              toast('Moved to list', { action: { label: 'Undo', onClick: () => onChangeRef.current(list) } });
              return;
            }

            const finishIdx =
              op === 'reorder-before'
                ? startIdx < targetIdx
                  ? targetIdx - 1
                  : targetIdx
                : startIdx < targetIdx
                  ? targetIdx
                  : targetIdx + 1;

            if (draggedLoc.container === targetLoc.container) {
              if (draggedLoc.container === 'root') {
                const reordered = reorderWithinContainer(list, startIdx, finishIdx) as SessionListItem[];
                onChangeRef.current(reordered);
                persistRef.current?.(reordered);
              } else {
                const group = list.find((i) => i.type === 'group' && i.id === draggedLoc.groupId) as GroupItem;
                const newChildren = reorderWithinContainer(group.children, startIdx, finishIdx) as ExerciseItem[];
                const next = list.map((i) =>
                  i.type === 'group' && i.id === draggedLoc.groupId ? { ...i, children: newChildren } : i
                ) as SessionListItem[];
                onChangeRef.current(next);
                persistRef.current?.(next);
              }
            } else {
              const { nextItems, removed } = removeItem(list, draggedLoc);
              const insertLoc: ItemLocation = op === 'reorder-before'
                ? { ...targetLoc, index: targetLoc.index }
                : { ...targetLoc, index: targetLoc.index + 1 };
              const next = insertItem(nextItems, insertLoc, removed, insertLoc.index);
              onChangeRef.current(next);
              persistRef.current?.(next);
            }
          }
        },
      })
    );

    const list = itemsRef.current;
    const entries = Array.from(itemRefs.current.entries());

    for (const [id, { el, handle }] of entries) {
      const item = getItemById(list, id);
      if (!item) continue;

      const loc = findItemLocation(list, id);
      if (!loc) continue;
      const fromContainer = loc.container === 'root' ? 'root' : loc.groupId!;
      const index = loc.index;

      cleanupFns.push(
        draggable({
          element: el,
          dragHandle: handle,
          getInitialData: () => {
            const loc = findItemLocation(list, id);
            const fromContainer = loc?.container === 'root' ? 'root' : (loc?.groupId ?? 'root');
            return { type: DRAG_TYPE, itemId: id, itemType: item.type, fromContainer } as DragData;
          },
          onDragStart: () => setDraggingId(id),
          onDrop: () => {
            setDraggingId(null);
            setDropState(null);
            clearMergeZone();
          },
        })
      );

      cleanupFns.push(
        dropTargetForElements({
          element: el,
          canDrop: ({ source }) => {
            const sourceData = source?.data as DragData | undefined;
            const sourceIsGroup = sourceData?.type === DRAG_TYPE && sourceData?.itemType === 'group';
            if (sourceIsGroup && fromContainer !== 'root') {
              return false;
            }
            return true;
          },
          getData: ({ input, element, source }) => {
            const sourceData = source?.data as DragData | undefined;
            const sourceIsGroup = sourceData?.type === DRAG_TYPE && sourceData?.itemType === 'group';

            let intent = getDropIntent(element as HTMLElement, input.clientY);
            if (sourceIsGroup) {
              intent = coercIntentForGroupSource(intent, element as HTMLElement, input.clientY);
              mergeZoneEnteredAtRef.current = null;
            }

            const now = Date.now();
            if (!sourceIsGroup && intent.intent === 'merge' && enableGrouping) {
              if (!mergeZoneEnteredAtRef.current) {
                mergeZoneEnteredAtRef.current = now;
              }
            } else if (!sourceIsGroup) {
              mergeZoneEnteredAtRef.current = null;
            }
            const mergeReady =
              !sourceIsGroup &&
              intent.intent === 'merge' &&
              enableGrouping &&
              mergeZoneEnteredAtRef.current != null &&
              now - mergeZoneEnteredAtRef.current >= MERGE_HOVER_DELAY_MS;

            dropIntentRef.current = {
              overId: id,
              intent: intent.intent,
              edge: intent.edge,
              mergeReady,
            };

            const data: DropData = {
              type: DRAG_TYPE,
              itemId: id,
              itemType: item.type,
              index,
              fromContainer,
              ...(item.type === 'group' ? { groupId: id } : {}),
              dropIntent: intent,
              mergeReady,
            };
            return data;
          },
          onDrag: ({ self }) => {
            const data = self.data as DropData;
            const intent = data.dropIntent;
            if (!intent) return;
            setDropState({
              targetId: id,
              edge: intent.edge === 'top' ? 'before' : intent.edge === 'bottom' ? 'after' : 'before',
              intent: intent.intent,
            });
            setMergeReady(data.mergeReady ?? false);
          },
          onDragLeave: () => {
            setDropState((prev) => (prev?.targetId === id ? null : prev));
            clearMergeZone();
          },
        })
      );
    }

    return () => {
      clearMergeZone();
      cleanupFns.forEach((fn) => fn());
    };
  }, [items, disabled, enableGrouping]);

  const registerRef = (id: string, el: HTMLElement | null, handle: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, { el, handle: handle ?? el });
    else itemRefs.current.delete(id);
  };

  return (
    <ul className="list-none p-0 m-0 space-y-2">
      {items.map((item) => {
        if (item.type === 'exercise') {
          const id = item.id;
          const isDragging = draggingId === id;
          const showBefore = dropState?.targetId === id && dropState?.edge === 'before' && dropState?.intent === 'reorder';
          const showAfter = dropState?.targetId === id && dropState?.edge === 'after' && dropState?.intent === 'reorder';
          const showMerge = dropState?.targetId === id && dropState?.intent === 'merge' && enableGrouping;

          return (
            <ExerciseRow
              key={id}
              item={item}
              isDragging={isDragging}
              disabled={disabled}
              renderExerciseRow={renderExerciseRow}
              registerRef={registerRef}
              showDropBefore={showBefore}
              showDropAfter={showAfter}
              showMergeIndicator={showMerge}
              mergeReady={mergeReady}
            />
          );
        } else {
          const id = item.id;
          const isDragging = draggingId === id;
          const showBefore = dropState?.targetId === id && dropState?.edge === 'before' && dropState?.intent === 'reorder';
          const showAfter = dropState?.targetId === id && dropState?.edge === 'after' && dropState?.intent === 'reorder';
          const showMerge = dropState?.targetId === id && dropState?.intent === 'merge' && enableGrouping;

          return (
            <GroupRow
              key={id}
              item={item}
              isDragging={isDragging}
              disabled={disabled}
              renderGroupRow={renderGroupRow}
              renderExerciseRow={renderExerciseRow}
              renderGroupChild={renderGroupChild}
              registerRef={registerRef}
              showDropBefore={showBefore}
              showDropAfter={showAfter}
              showMergeIndicator={showMerge}
              mergeReady={mergeReady}
              dropState={dropState}
              enableGrouping={enableGrouping}
            />
          );
        }
      })}
    </ul>
  );
}

function ExerciseRow({
  item,
  isDragging,
  disabled,
  renderExerciseRow,
  registerRef,
  showDropBefore,
  showDropAfter,
  showMergeIndicator,
  mergeReady,
}: {
  item: ExerciseItem;
  isDragging: boolean;
  disabled: boolean;
  renderExerciseRow: (ex: ExerciseItem, ctx: ExerciseRowContext) => React.ReactNode;
  registerRef: (id: string, el: HTMLElement | null, handle: HTMLElement | null) => void;
  showDropBefore: boolean;
  showDropAfter: boolean;
  showMergeIndicator: boolean;
  mergeReady: boolean;
}) {
  const elRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(item.id, elRef.current, handleRef.current);
    return () => registerRef(item.id, null, null);
  }, [item.id, registerRef]);

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
      layoutId={`item-${item.id}`}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
      {showMergeIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 rounded-lg z-10 flex items-center justify-center gap-2 ${
            mergeReady ? 'bg-accent/20' : 'bg-accent/10'
          }`}
        >
          <Link2 className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium text-accent">Group</span>
        </motion.div>
      )}
      {renderExerciseRow(item, { dragHandleProps: disabled ? {} : dragHandleProps, isDragging })}
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

function GroupRow({
  item,
  isDragging,
  disabled,
  renderGroupRow,
  renderExerciseRow,
  renderGroupChild,
  registerRef,
  showDropBefore,
  showDropAfter,
  showMergeIndicator,
  mergeReady,
  dropState,
  enableGrouping,
}: {
  item: GroupItem;
  isDragging: boolean;
  disabled: boolean;
  renderGroupRow: (g: GroupItem, ctx: GroupRowContext, slots: { children: React.ReactNode }) => React.ReactNode;
  renderExerciseRow: (ex: ExerciseItem, ctx: ExerciseRowContext) => React.ReactNode;
  renderGroupChild?: (child: ExerciseItem, ctx: ExerciseRowContext & { onRemoveFromGroup: () => void }) => React.ReactNode;
  registerRef: (id: string, el: HTMLElement | null, handle: HTMLElement | null) => void;
  showDropBefore: boolean;
  showDropAfter: boolean;
  showMergeIndicator: boolean;
  mergeReady: boolean;
  dropState: { targetId: string; edge: 'before' | 'after'; intent: 'reorder' | 'merge' } | null;
  enableGrouping: boolean;
}) {
  const elRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(item.id, elRef.current, handleRef.current);
    return () => registerRef(item.id, null, null);
  }, [item.id, registerRef]);

  const dragHandleProps = {
    ref: handleRef,
    'data-drag-handle': true,
    className: 'cursor-grab active:cursor-grabbing touch-none select-none',
    style: { WebkitTouchCallout: 'none' as const, userSelect: 'none' as const },
  };

  const handleRemoveFromGroup = (childId: string) => {
    const list = itemsRef.current;
    const groupIdx = list.findIndex((i) => i.type === 'group' && i.id === item.id);
    if (groupIdx === -1) return;
    const next = pullChildOutOfGroup(list, item.id, childId, groupIdx + 1);
    onChangeRef.current(next);
    persistRef.current?.(next);
  };

  const children = item.children.map((child) => (
    <GroupChildRow
      key={child.id}
      child={child}
      groupId={item.id}
      disabled={disabled}
      renderExerciseRow={renderExerciseRow}
      renderGroupChild={renderGroupChild}
      registerRef={registerRef}
      dropState={dropState}
      onRemoveFromGroup={() => handleRemoveFromGroup(child.id)}
    />
  ));

  return (
    <motion.li
      ref={elRef}
      layout
      layoutId={`group-${item.id}`}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
      {showMergeIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 rounded-lg z-10 flex items-center justify-center gap-2 ${
            mergeReady ? 'bg-accent/20' : 'bg-accent/10'
          }`}
        >
          <Link2 className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium text-accent">Add to group</span>
        </motion.div>
      )}
      {renderGroupRow(item, { dragHandleProps: disabled ? {} : dragHandleProps, isDragging }, { children })}
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

function GroupChildRow({
  child,
  groupId,
  disabled,
  renderExerciseRow,
  renderGroupChild,
  registerRef,
  dropState,
  onRemoveFromGroup,
}: {
  child: ExerciseItem;
  groupId: string;
  disabled: boolean;
  renderExerciseRow: (ex: ExerciseItem, ctx: ExerciseRowContext) => React.ReactNode;
  renderGroupChild?: (child: ExerciseItem, ctx: ExerciseRowContext & { onRemoveFromGroup: () => void }) => React.ReactNode;
  registerRef: (id: string, el: HTMLElement | null, handle: HTMLElement | null) => void;
  dropState: { targetId: string; edge: 'before' | 'after'; intent: 'reorder' | 'merge' } | null;
  onRemoveFromGroup: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(child.id, elRef.current, handleRef.current);
    return () => registerRef(child.id, null, null);
  }, [child.id, registerRef]);

  const dragHandleProps = {
    ref: handleRef,
    'data-drag-handle': true,
    className: 'cursor-grab active:cursor-grabbing touch-none select-none',
    style: { WebkitTouchCallout: 'none' as const, userSelect: 'none' as const },
  };

  const showBefore = dropState?.targetId === child.id && dropState?.edge === 'before' && dropState?.intent === 'reorder';
  const showAfter = dropState?.targetId === child.id && dropState?.edge === 'after' && dropState?.intent === 'reorder';

  const content = renderGroupChild
    ? renderGroupChild(child, { dragHandleProps: disabled ? {} : dragHandleProps, isDragging: false, onRemoveFromGroup })
    : renderExerciseRow(child, { dragHandleProps: disabled ? {} : dragHandleProps, isDragging: false });

  return (
    <motion.div
      ref={elRef}
      layout
      layoutId={`child-${child.id}`}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      initial={false}
      className="relative"
    >
      <AnimatePresence>
        {showBefore && (
          <motion.div
            key="drop-before"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 h-0.5 bg-accent rounded-full z-20"
            style={{ top: -2 }}
          />
        )}
      </AnimatePresence>
      {content}
      <AnimatePresence>
        {showAfter && (
          <motion.div
            key="drop-after"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 h-0.5 bg-accent rounded-full z-20"
            style={{ bottom: -2 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
