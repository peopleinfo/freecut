import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Marquee selection state
 */
export interface MarqueeState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Rectangle for collision detection
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Item that can be selected with marquee
 */
export interface MarqueeItem {
  id: string;
  getBoundingRect: () => Rect;
}

/**
 * Options for marquee selection
 */
export interface UseMarqueeSelectionOptions {
  /** The container element that marquee selection is scoped to */
  containerRef: React.RefObject<HTMLElement>;

  /** Optional separate hit area for bounds checking (defaults to containerRef) */
  hitAreaRef?: React.RefObject<HTMLElement>;

  /** Items that can be selected */
  items: MarqueeItem[];

  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;

  /** Whether marquee selection is enabled */
  enabled?: boolean;

  /** Whether to append to existing selection (default: false, replaces selection) */
  appendMode?: boolean;

  /** Minimum drag distance before marquee activates (pixels) */
  threshold?: number;
}

/**
 * Check if two rectangles intersect (partial or full overlap)
 *
 * Returns true if the rectangles have ANY overlap at all, even if just touching edges.
 * Does NOT require one rectangle to be fully contained within the other.
 */
export function rectIntersects(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}

/**
 * Convert marquee start/current points to a rectangle
 */
export function getMarqueeRect(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): Rect {
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const right = Math.max(startX, currentX);
  const bottom = Math.max(startY, currentY);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Reusable marquee selection hook
 *
 * Provides mouse-based marquee (drag rectangle) selection for any grid/canvas of items.
 * Can be used for media library, timeline clips, preview gizmos, etc.
 *
 * @example
 * ```tsx
 * const { marqueeState, selectedIds } = useMarqueeSelection({
 *   containerRef,
 *   items: mediaItems.map(item => ({
 *     id: item.id,
 *     getBoundingRect: () => {
 *       const el = document.getElementById(item.id);
 *       return el?.getBoundingClientRect() || defaultRect;
 *     }
 *   })),
 *   onSelectionChange: (ids) => updateSelection(ids)
 * });
 * ```
 */
// Global flag to track when marquee selection just finished
// Used to prevent background click handlers from clearing selection
let marqueeJustFinished = false;

export function isMarqueeJustFinished(): boolean {
  return marqueeJustFinished;
}

export function useMarqueeSelection({
  containerRef,
  hitAreaRef,
  items,
  onSelectionChange,
  enabled = true,
  appendMode = false,
  threshold = 5,
}: UseMarqueeSelectionOptions) {
  // Use hitAreaRef for bounds checking if provided, otherwise fall back to containerRef
  const boundsRef = hitAreaRef ?? containerRef;
  const [marqueeState, setMarqueeState] = useState<MarqueeState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const prevSelectedIdsRef = useRef<string[]>([]);

  // Keep ref up to date
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Update selection based on current marquee
  // Once an item is selected, keep it selected until marquee ends
  const updateSelection = useCallback(() => {
    if (!marqueeState.active || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Convert marquee from content space to viewport space for comparison
    // Marquee coordinates include scroll offset, so we subtract it and add container position
    const marqueeRect = getMarqueeRect(
      marqueeState.startX - container.scrollLeft + containerRect.left,
      marqueeState.startY - container.scrollTop + containerRect.top,
      marqueeState.currentX - container.scrollLeft + containerRect.left,
      marqueeState.currentY - container.scrollTop + containerRect.top
    );

    // Find all items that intersect with marquee
    const intersectingIds = items
      .filter((item) => {
        const itemRect = item.getBoundingRect();
        return rectIntersects(marqueeRect, itemRect);
      })
      .map((item) => item.id);

    // Merge with previously selected items (don't deselect during drag)
    const prevIds = prevSelectedIdsRef.current;
    const mergedIds = [...new Set([...prevIds, ...intersectingIds])];

    // Only update if we have new items
    const hasNewItems = mergedIds.length > prevIds.length;

    if (hasNewItems) {
      setSelectedIds(mergedIds);
      prevSelectedIdsRef.current = mergedIds;
      onSelectionChangeRef.current?.(mergedIds);
    }
  }, [marqueeState, items, containerRef]);

  // Handle mouse down - start marquee
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !containerRef.current || !boundsRef.current) return;

      // Only trigger on left click
      if (e.button !== 0) return;

      // Check if click is inside hit area bounds
      const boundsEl = boundsRef.current;
      const rect = boundsEl.getBoundingClientRect();

      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }

      // Don't start marquee if clicking on an interactive element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        // Don't start marquee if clicking on a draggable timeline item
        target.closest('[data-item-id]') ||
        // Don't start marquee if clicking on a draggable media card
        target.closest('[data-media-id]') ||
        // Don't start marquee if clicking in the timeline ruler
        target.closest('.timeline-ruler') ||
        // Don't start marquee if clicking on the playhead handle
        target.closest('[data-playhead-handle]') ||
        // Don't start marquee if clicking on gizmo elements (handles, borders)
        target.closest('[data-gizmo]')
      ) {
        return;
      }

      isDraggingRef.current = true;
      hasMovedRef.current = false;
      prevSelectedIdsRef.current = []; // Reset accumulated selection for new marquee

      // Calculate position relative to the container (for marquee display)
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const startX = e.clientX - containerRect.left + container.scrollLeft;
      const startY = e.clientY - containerRect.top + container.scrollTop;

      setMarqueeState({
        active: false, // Don't activate until we move past threshold
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      });

      // Clear selection if not in append mode
      if (!appendMode) {
        setSelectedIds([]);
      }
    },
    [enabled, containerRef, boundsRef, appendMode]
  );

  // Handle mouse move - update marquee
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // Account for scroll offset to get position in content space
      const currentX = e.clientX - rect.left + container.scrollLeft;
      const currentY = e.clientY - rect.top + container.scrollTop;

      // Check if we've moved past threshold
      if (!hasMovedRef.current) {
        const deltaX = Math.abs(currentX - marqueeState.startX);
        const deltaY = Math.abs(currentY - marqueeState.startY);

        if (deltaX > threshold || deltaY > threshold) {
          hasMovedRef.current = true;
        } else {
          return; // Don't activate yet
        }
      }

      setMarqueeState((prev) => ({
        ...prev,
        active: true,
        currentX,
        currentY,
      }));
    },
    [containerRef, threshold, marqueeState.startX, marqueeState.startY]
  );

  // Handle mouse up - end marquee
  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Only process if we were dragging
    if (!isDraggingRef.current) return;

    const wasActualDrag = hasMovedRef.current;

    // Selection is already updated in real-time via updateSelection
    // Just clean up the marquee state
    isDraggingRef.current = false;
    hasMovedRef.current = false;

    setMarqueeState({
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    // Only prevent background click if an actual marquee drag happened
    if (wasActualDrag) {
      e.stopPropagation();
      e.preventDefault();

      marqueeJustFinished = true;
      requestAnimationFrame(() => {
        marqueeJustFinished = false;
      });
    }
  }, []);

  // Update selection as marquee moves
  useEffect(() => {
    if (marqueeState.active) {
      updateSelection();
    }
  }, [marqueeState.active, marqueeState.currentX, marqueeState.currentY, updateSelection]);

  // Register global mouse event listeners
  // Listen at document level to support containers with pointer-events: none
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Use capture phase to intercept before other handlers
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [enabled, containerRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    marqueeState,
    selectedIds,
  };
}
