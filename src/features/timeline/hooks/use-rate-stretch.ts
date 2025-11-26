import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineItem } from '@/types/timeline';
import type { SnapTarget } from '../types/drag';
import { useTimelineStore } from '../stores/timeline-store';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { useTimelineZoom } from './use-timeline-zoom';
import { useSnapCalculator } from './use-snap-calculator';

export type StretchHandle = 'start' | 'end';

// Speed limits
export const MIN_SPEED = 0.1;
export const MAX_SPEED = 10.0;

interface StretchState {
  isStretching: boolean;
  handle: StretchHandle | null;
  startX: number;
  initialFrom: number;
  initialDuration: number;
  sourceDuration: number;
  initialSpeed: number;
  currentDelta: number; // Track current delta for visual feedback
}

/**
 * Calculate duration limits based on speed constraints
 */
function getDurationLimits(sourceDuration: number): { min: number; max: number } {
  return {
    min: Math.max(1, Math.ceil(sourceDuration / MAX_SPEED)),
    max: Math.floor(sourceDuration / MIN_SPEED),
  };
}

/**
 * Calculate speed from source duration and timeline duration
 */
function calculateSpeed(sourceDuration: number, timelineDuration: number): number {
  if (timelineDuration <= 0) return 1;
  const speed = sourceDuration / timelineDuration;
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
}

/**
 * Hook for handling timeline item rate stretching
 *
 * Rate stretch changes playback speed by adjusting duration while preserving all content.
 * - Longer duration = slower playback
 * - Shorter duration = faster playback
 * - Speed range: 0.1x to 10x
 *
 * Optimized approach:
 * - Visual feedback via local state during drag (no store updates)
 * - Only commit to store on mouseup (single undo entry)
 * - Snapping support for stretch edges to grid and item boundaries
 */
export function useRateStretch(item: TimelineItem, timelineDuration: number, trackLocked: boolean = false) {
  const { pixelsToTime } = useTimelineZoom();
  const fps = useTimelineStore((s) => s.fps);
  const rateStretchItem = useTimelineStore((s) => s.rateStretchItem);
  const setDragState = useSelectionStore((s) => s.setDragState);

  // Use snap calculator - pass item.id to exclude self from magnetic snaps
  // Only use magnetic snap targets (item edges), not grid lines
  const { magneticSnapTargets, snapThresholdFrames, snapEnabled } = useSnapCalculator(
    timelineDuration,
    item.id
  );

  const [stretchState, setStretchState] = useState<StretchState>({
    isStretching: false,
    handle: null,
    startX: 0,
    initialFrom: 0,
    initialDuration: 0,
    sourceDuration: 0,
    initialSpeed: 1,
    currentDelta: 0,
  });

  const stretchStateRef = useRef(stretchState);
  stretchStateRef.current = stretchState;

  // Track previous snap target to avoid unnecessary store updates
  const prevSnapTargetRef = useRef<{ frame: number; type: string } | null>(null);

  /**
   * Find nearest snap target for a given frame position
   */
  const findSnapForFrame = useCallback(
    (targetFrame: number): { snappedFrame: number; snapTarget: SnapTarget | null } => {
      if (!snapEnabled || magneticSnapTargets.length === 0) {
        return { snappedFrame: targetFrame, snapTarget: null };
      }

      let nearestTarget: SnapTarget | null = null;
      let minDistance = snapThresholdFrames;

      for (const target of magneticSnapTargets) {
        const distance = Math.abs(targetFrame - target.frame);
        if (distance < minDistance) {
          nearestTarget = target;
          minDistance = distance;
        }
      }

      if (nearestTarget) {
        return { snappedFrame: nearestTarget.frame, snapTarget: nearestTarget };
      }

      return { snappedFrame: targetFrame, snapTarget: null };
    },
    [snapEnabled, magneticSnapTargets, snapThresholdFrames]
  );

  // Mouse move handler - only updates local state for visual feedback
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!stretchStateRef.current.isStretching || trackLocked) return;

      const deltaX = e.clientX - stretchStateRef.current.startX;
      const deltaTime = pixelsToTime(deltaX);
      let deltaFrames = Math.round(deltaTime * fps);

      const { handle, initialFrom, initialDuration, sourceDuration } = stretchStateRef.current;
      const limits = getDurationLimits(sourceDuration);

      // Calculate the target edge position and apply snapping
      let targetEdgeFrame: number;
      if (handle === 'start') {
        // For start handle, we're moving the start position (compressing from left)
        // newDuration = initialDuration - deltaFrames
        // newFrom = initialFrom + (initialDuration - newDuration)
        // The edge that moves is the new start position: initialFrom + deltaFrames (when delta > 0, edge moves right)
        targetEdgeFrame = initialFrom + deltaFrames;
      } else {
        // For end handle, we're moving the end position
        // newDuration = initialDuration + deltaFrames
        // The edge that moves is the end: initialFrom + initialDuration + deltaFrames
        targetEdgeFrame = initialFrom + initialDuration + deltaFrames;
      }

      // Find snap target for the edge being stretched
      const { snappedFrame, snapTarget } = findSnapForFrame(targetEdgeFrame);

      // If snapped, adjust deltaFrames accordingly while respecting speed limits
      if (snapTarget) {
        if (handle === 'start') {
          // snappedFrame = initialFrom + newDelta
          const newDelta = snappedFrame - initialFrom;
          // Check if the resulting duration is within limits
          const proposedDuration = initialDuration - newDelta;
          if (proposedDuration >= limits.min && proposedDuration <= limits.max) {
            deltaFrames = newDelta;
          }
        } else {
          // snappedFrame = initialFrom + initialDuration + newDelta
          const newDelta = snappedFrame - (initialFrom + initialDuration);
          // Check if the resulting duration is within limits
          const proposedDuration = initialDuration + newDelta;
          if (proposedDuration >= limits.min && proposedDuration <= limits.max) {
            deltaFrames = newDelta;
          }
        }
      }

      // Update local state for visual feedback
      if (deltaFrames !== stretchStateRef.current.currentDelta) {
        setStretchState(prev => ({ ...prev, currentDelta: deltaFrames }));
      }

      // Update snap target visualization (only when changed)
      const prevSnap = prevSnapTargetRef.current;
      const snapChanged =
        (prevSnap === null && snapTarget !== null) ||
        (prevSnap !== null && snapTarget === null) ||
        (prevSnap !== null && snapTarget !== null && (prevSnap.frame !== snapTarget.frame || prevSnap.type !== snapTarget.type));

      if (snapChanged) {
        prevSnapTargetRef.current = snapTarget ? { frame: snapTarget.frame, type: snapTarget.type } : null;
        setDragState({
          isDragging: true,
          draggedItemIds: [item.id],
          offset: { x: deltaX, y: 0 },
          activeSnapTarget: snapTarget,
        });
      }
    },
    [pixelsToTime, fps, trackLocked, findSnapForFrame, setDragState, item.id]
  );

  // Mouse up handler - commits changes to store (single update)
  const handleMouseUp = useCallback(() => {
    if (stretchStateRef.current.isStretching) {
      const { handle, initialFrom, initialDuration, sourceDuration, currentDelta } = stretchStateRef.current;
      const limits = getDurationLimits(sourceDuration);

      let newDuration: number;
      let newFrom: number;

      if (handle === 'start') {
        // Start handle: delta right = compress (shorter duration), delta left = extend
        newDuration = Math.round(Math.max(limits.min, Math.min(limits.max, initialDuration - currentDelta)));
        const durationChange = initialDuration - newDuration;
        newFrom = Math.round(initialFrom + durationChange); // Maintain end position
      } else {
        // End handle: delta right = extend (longer duration), delta left = compress
        newDuration = Math.round(Math.max(limits.min, Math.min(limits.max, initialDuration + currentDelta)));
        newFrom = Math.round(initialFrom);
      }

      const newSpeed = calculateSpeed(sourceDuration, newDuration);

      // Only update store if there was actual change (compare rounded values)
      if (newDuration !== initialDuration) {
        rateStretchItem(item.id, newFrom, newDuration, newSpeed);
      }

      // Clear drag state (including snap indicator)
      setDragState(null);
      prevSnapTargetRef.current = null;

      setStretchState({
        isStretching: false,
        handle: null,
        startX: 0,
        initialFrom: 0,
        initialDuration: 0,
        sourceDuration: 0,
        initialSpeed: 1,
        currentDelta: 0,
      });
    }
  }, [item.id, rateStretchItem, setDragState]);

  // Setup and cleanup mouse event listeners
  useEffect(() => {
    if (stretchState.isStretching) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [stretchState.isStretching, handleMouseMove, handleMouseUp]);

  // Start stretch drag
  const handleStretchStart = useCallback(
    (e: React.MouseEvent, handle: StretchHandle) => {
      if (trackLocked) return;

      // Only works on video/audio items
      if (item.type !== 'video' && item.type !== 'audio') return;

      e.stopPropagation();
      e.preventDefault();

      // Calculate the visible source frames (the [B-C] region being displayed)
      // This is what gets rate-stretched - NOT the full source duration
      // Formula: timeline frames * current speed = source frames currently shown
      const currentSpeed = item.speed || 1;
      const visibleSourceFrames = Math.round(item.durationInFrames * currentSpeed);

      setStretchState({
        isStretching: true,
        handle,
        startX: e.clientX,
        initialFrom: item.from,
        initialDuration: item.durationInFrames,
        sourceDuration: visibleSourceFrames,
        initialSpeed: currentSpeed,
        currentDelta: 0,
      });
    },
    [item, trackLocked]
  );

  // Calculate visual feedback during stretch
  const getVisualFeedback = useCallback(() => {
    if (!stretchState.isStretching) return null;

    const { handle, initialFrom, initialDuration, sourceDuration, currentDelta } = stretchState;
    const limits = getDurationLimits(sourceDuration);

    let newDuration: number;
    let newFrom: number;

    if (handle === 'start') {
      newDuration = Math.round(Math.max(limits.min, Math.min(limits.max, initialDuration - currentDelta)));
      const durationChange = initialDuration - newDuration;
      newFrom = Math.round(initialFrom + durationChange);
    } else {
      newDuration = Math.round(Math.max(limits.min, Math.min(limits.max, initialDuration + currentDelta)));
      newFrom = Math.round(initialFrom);
    }

    const previewSpeed = calculateSpeed(sourceDuration, newDuration);

    return {
      from: newFrom,
      duration: newDuration,
      speed: previewSpeed,
    };
  }, [stretchState]);

  return {
    isStretching: stretchState.isStretching,
    stretchHandle: stretchState.handle,
    stretchDelta: stretchState.currentDelta,
    handleStretchStart,
    getVisualFeedback,
  };
}
