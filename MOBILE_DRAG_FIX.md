# Mobile Drag Reorder Fix

## Summary
Fixed mobile drag reorder issue where long-pressing the drag handle was selecting text instead of initiating drag. The solution adds touch/pointer event handlers and CSS to prevent text selection while maintaining desktop HTML5 drag/drop compatibility.

## Changes Made

### 1. CSS Styles (`src/styles/tailwind.css`)
Added `.drag-handle` class with:
- `-webkit-touch-callout: none` - Prevents iOS callout menu
- `-webkit-user-select: none` - Prevents text selection on WebKit
- `user-select: none` - Prevents text selection
- `touch-action: none` - Prevents default touch behaviors (scrolling, zooming)
- `cursor: grab` / `cursor: grabbing` - Visual feedback

### 2. Touch/Pointer Event Handlers
Added mobile-specific handlers to all three screens with drag functionality:

**WorkoutSessionScreen.tsx:**
- `handleHandleTouchStart` - Initiates drag from handle
- `handleHandlePointerDown` - Prevents text selection on pointer down
- `handleRowTouchMove` - Tracks touch movement and reorders
- `handleRowTouchEnd` - Ends drag operation

**CreateWorkoutScreen.tsx:**
- Same handlers as above

**ViewTemplateScreen.tsx:**
- Same handlers as above

### 3. Implementation Details

**State Management:**
- `touchStartY` - Initial touch Y position
- `touchStartIndex` - Initial item index
- `isDraggingFromHandle` - Flag to ensure drag only works when started from handle
- `draggedIndex` - Currently dragged item (shared with HTML5 drag)

**Touch Handling Logic:**
1. User touches drag handle → `handleHandleTouchStart` fires
2. Sets `isDraggingFromHandle = true` and records start position/index
3. As user moves finger → `handleRowTouchMove` on row tracks movement
4. When movement > 20px, calculates target index and reorders
5. On touch end → `handleRowTouchEnd` resets all state

**Key Features:**
- Only drag handle prevents text selection (not entire row)
- Row remains tappable for other interactions
- Desktop HTML5 drag/drop still works
- Mobile uses touch events for dragging
- Prevents default selection behavior on handle

## Files Modified

1. `src/styles/tailwind.css` - Added `.drag-handle` CSS class
2. `src/app/screens/WorkoutSessionScreen.tsx` - Added touch handlers
3. `src/app/screens/CreateWorkoutScreen.tsx` - Added touch handlers
4. `src/app/screens/ViewTemplateScreen.tsx` - Added touch handlers

## Testing Checklist

### iOS Safari
- [ ] Long-press on drag handle does NOT show text selection/callout
- [ ] Long-press and drag reorders exercises correctly
- [ ] Row remains tappable for other actions
- [ ] No text selection occurs during drag

### Android Chrome
- [ ] Long-press on drag handle does NOT show text selection
- [ ] Long-press and drag reorders exercises correctly
- [ ] Row remains tappable for other actions
- [ ] No text selection occurs during drag

### Desktop (Chrome/Firefox/Safari)
- [ ] HTML5 drag/drop still works
- [ ] Drag handle shows grab cursor
- [ ] Reordering works as before

## Notes

- The implementation uses a hybrid approach: HTML5 drag/drop for desktop, touch events for mobile
- Touch events are only active when drag is initiated from the handle (via `isDraggingFromHandle` flag)
- Row touch handlers (`onTouchMove`, `onTouchEnd`) only process events when `isDraggingFromHandle` is true
- This ensures normal row interactions (tapping, scrolling) are not affected

