import { useCallback, useRef, useEffect, useState, useEffectEvent } from 'react';
import type { Point } from '../types/gizmo';

/**
 * Modifier keys state during drag.
 */
export interface DragModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
}

/**
 * Configuration for useDragInteraction hook.
 */
export interface DragInteractionConfig<TSnapshot = unknown> {
  /**
   * Convert screen coordinates to canvas coordinates.
   * Called for each mouse event.
   */
  toCanvasPoint: (e: MouseEvent) => Point;

  /**
   * Called when drag starts. Returns a snapshot value
   * that will be passed to onDragEnd for change detection.
   */
  onDragStart: (point: Point) => TSnapshot;

  /**
   * Called on each mouse move during drag.
   */
  onDragMove: (point: Point, delta: Point, modifiers: DragModifiers) => void;

  /**
   * Called when drag ends (mouse up).
   * @param snapshot - The value returned from onDragStart
   * @param hasMoved - True if mouse moved beyond dragThreshold
   * @param endPoint - The canvas point where drag ended
   */
  onDragEnd: (snapshot: TSnapshot, hasMoved: boolean, endPoint: Point) => void;

  /**
   * Called when drag is cancelled (escape key).
   */
  onCancel: () => void;

  /**
   * Cursor to show during drag.
   * @default 'move'
   */
  cursor?: string;

  /**
   * Minimum pixels of screen movement before considering it a "drag".
   * Useful for distinguishing clicks from drags.
   * @default 0
   */
  dragThreshold?: number;
}

/**
 * Return value from useDragInteraction hook.
 */
export interface DragInteractionResult {
  /**
   * Start a drag from a React mouse event.
   * Typically called from onMouseDown.
   */
  startDrag: (e: React.MouseEvent) => void;

  /**
   * Whether currently dragging.
   */
  isDragging: boolean;
}

/**
 * Hook to handle drag interactions with proper cleanup.
 *
 * Encapsulates the common pattern of:
 * - Setting up window mousemove/mouseup listeners
 * - Managing document cursor during drag
 * - Handling escape key cancellation
 * - Detecting drag vs click via threshold
 *
 * @example
 * const { startDrag, isDragging } = useDragInteraction({
 *   toCanvasPoint: (e) => screenToCanvas(e.clientX, e.clientY, coordParams),
 *   onDragStart: (point) => {
 *     // Store initial state, return snapshot
 *     return { ...currentTransform };
 *   },
 *   onDragMove: (point, delta, modifiers) => {
 *     // Update preview
 *     setPreviewTransform({ x: startX + delta.x, y: startY + delta.y });
 *   },
 *   onDragEnd: (snapshot, hasMoved) => {
 *     if (hasMoved) {
 *       commitTransform(getPreviewTransform());
 *     }
 *     clearPreview();
 *   },
 *   onCancel: () => {
 *     clearPreview();
 *   },
 *   cursor: 'move',
 *   dragThreshold: 5,
 * });
 *
 * <div onMouseDown={startDrag} />
 */
export function useDragInteraction<TSnapshot = unknown>(
  config: DragInteractionConfig<TSnapshot>
): DragInteractionResult {
  const {
    toCanvasPoint,
    onDragStart,
    onDragMove,
    onDragEnd,
    onCancel,
    cursor = 'move',
    dragThreshold = 0,
  } = config;

  const [isDragging, setIsDragging] = useState(false);

  // Refs to track drag state across event handlers
  const startPointRef = useRef<Point | null>(null);
  const startScreenRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<TSnapshot | null>(null);
  const hasMovedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup function to remove listeners and reset state
  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    document.body.style.cursor = '';
    startPointRef.current = null;
    startScreenRef.current = null;
    snapshotRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
  }, []);

  // Escape key handler - using useEffectEvent so changes to onCancel don't re-register listener
  const onEscapeKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
      cleanup();
    }
  });

  // Handle escape key during drag
  // With useEffectEvent, we only need to depend on isDragging
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('keydown', onEscapeKeyDown);
    return () => window.removeEventListener('keydown', onEscapeKeyDown);
  }, [isDragging]);

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const point = toCanvasPoint(e.nativeEvent);
      const snapshot = onDragStart(point);

      startPointRef.current = point;
      startScreenRef.current = { x: e.clientX, y: e.clientY };
      snapshotRef.current = snapshot;
      hasMovedRef.current = false;
      setIsDragging(true);
      document.body.style.cursor = cursor;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const startPoint = startPointRef.current;
        const startScreen = startScreenRef.current;
        if (!startPoint || !startScreen) return;

        // Check if we've exceeded drag threshold
        if (!hasMovedRef.current && dragThreshold > 0) {
          const screenDx = Math.abs(moveEvent.clientX - startScreen.x);
          const screenDy = Math.abs(moveEvent.clientY - startScreen.y);
          if (screenDx > dragThreshold || screenDy > dragThreshold) {
            hasMovedRef.current = true;
          }
        } else if (dragThreshold === 0) {
          // No threshold, always consider it moved after any movement
          hasMovedRef.current = true;
        }

        const movePoint = toCanvasPoint(moveEvent);
        const delta: Point = {
          x: movePoint.x - startPoint.x,
          y: movePoint.y - startPoint.y,
        };

        onDragMove(movePoint, delta, {
          shiftKey: moveEvent.shiftKey,
          ctrlKey: moveEvent.ctrlKey,
        });
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        const snapshot = snapshotRef.current as TSnapshot;
        const hasMoved = hasMovedRef.current;
        const endPoint = toCanvasPoint(upEvent);

        // Remove listeners first
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        cleanupRef.current = null;

        // Call onDragEnd before cleanup to allow access to refs
        onDragEnd(snapshot, hasMoved, endPoint);

        // Then cleanup state
        document.body.style.cursor = '';
        startPointRef.current = null;
        startScreenRef.current = null;
        snapshotRef.current = null;
        hasMovedRef.current = false;
        setIsDragging(false);
      };

      // Store cleanup so it can be called on escape or unmount
      cleanupRef.current = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [toCanvasPoint, onDragStart, onDragMove, onDragEnd, cursor, dragThreshold]
  );

  return {
    startDrag,
    isDragging,
  };
}

/**
 * Simplified hook for cases where you just need escape key cancellation
 * during an interaction managed elsewhere.
 *
 * @example
 * useEscapeCancel(isInteracting, () => {
 *   cancelInteraction();
 *   document.body.style.cursor = '';
 * });
 */
export function useEscapeCancel(
  isActive: boolean,
  onCancel: () => void
): void {
  // Using useEffectEvent so changes to onCancel don't re-register listener
  const onEscapeKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  });

  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('keydown', onEscapeKeyDown);
    return () => window.removeEventListener('keydown', onEscapeKeyDown);
  }, [isActive]);
}
