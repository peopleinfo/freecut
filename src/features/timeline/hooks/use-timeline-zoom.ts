import { useCallback } from 'react';
import { useTimelineStore } from '../stores/timeline-store';

export interface UseTimelineZoomOptions {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Timeline zoom hook with utilities for converting between time and pixels
 *
 * Uses granular Zustand selectors for optimal performance
 */
export function useTimelineZoom(options: UseTimelineZoomOptions = {}) {
  const {
    minZoom = 0.1,
    maxZoom = 2,
  } = options;

  // Use granular selectors - Zustand v5 best practice
  const zoomLevel = useTimelineStore((s) => s.zoomLevel);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const fps = useTimelineStore((s) => s.fps);

  // Pixels per second at current zoom level
  const pixelsPerSecond = zoomLevel * 100;

  /**
   * Convert time (in seconds) to pixels at current zoom level
   */
  const timeToPixels = useCallback(
    (timeInSeconds: number) => {
      return timeInSeconds * pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  /**
   * Convert pixels to time (in seconds) at current zoom level
   */
  const pixelsToTime = useCallback(
    (pixels: number) => {
      return pixels / pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  /**
   * Convert frame number to pixels
   */
  const frameToPixels = useCallback(
    (frame: number) => {
      const timeInSeconds = frame / fps;
      return timeToPixels(timeInSeconds);
    },
    [fps, timeToPixels]
  );

  /**
   * Convert pixels to frame number
   */
  const pixelsToFrame = useCallback(
    (pixels: number) => {
      const timeInSeconds = pixelsToTime(pixels);
      return Math.round(timeInSeconds * fps);
    },
    [fps, pixelsToTime]
  );

  /**
   * Zoom in by 10%
   */
  const zoomIn = useCallback(() => {
    setZoom(Math.min(maxZoom, zoomLevel + 0.1));
  }, [zoomLevel, maxZoom, setZoom]);

  /**
   * Zoom out by 10%
   */
  const zoomOut = useCallback(() => {
    setZoom(Math.max(minZoom, zoomLevel - 0.1));
  }, [zoomLevel, minZoom, setZoom]);

  /**
   * Reset zoom to 1x
   */
  const resetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  return {
    zoomLevel,
    pixelsPerSecond,
    timeToPixels,
    pixelsToTime,
    frameToPixels,
    pixelsToFrame,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom: (level: number) => setZoom(Math.max(minZoom, Math.min(maxZoom, level))),
  };
}
