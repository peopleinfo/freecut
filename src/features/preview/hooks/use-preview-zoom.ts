import { useCallback } from 'react';
import { usePlaybackStore } from '../stores/playback-store';

/**
 * Zoom presets for preview
 */
const ZOOM_PRESETS = [
  { label: 'Fit', value: 'fit' as const },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
  { label: '200%', value: 2 },
] as const;

export type ZoomPreset = (typeof ZOOM_PRESETS)[number];

interface UsePreviewZoomOptions {
  containerWidth?: number;
  containerHeight?: number;
  projectWidth: number;
  projectHeight: number;
}

/**
 * Hook for managing preview zoom level
 *
 * Provides:
 * - Current zoom level from store
 * - Preset zoom levels (Fit, 50%, 100%, 200%)
 * - Fine-tune zoom setter
 * - Fit-to-viewport calculation
 *
 * @param options - Container and project dimensions for fit calculation
 * @returns Zoom state and controls
 */
export function usePreviewZoom(options?: UsePreviewZoomOptions) {
  const zoom = usePlaybackStore((s) => s.zoom);
  const setZoom = usePlaybackStore((s) => s.setZoom);

  /**
   * Handle preset zoom selection
   */
  const handlePresetZoom = useCallback(
    (preset: ZoomPreset) => {
      if (preset.value === 'fit' && options) {
        // Calculate fit zoom based on container size
        const { containerWidth, containerHeight, projectWidth, projectHeight } = options;

        if (containerWidth && containerHeight) {
          const scaleX = containerWidth / projectWidth;
          const scaleY = containerHeight / projectHeight;
          // Use the smaller scale to ensure the entire composition fits
          const fitZoom = Math.min(scaleX, scaleY);
          setZoom(Number(fitZoom.toFixed(2))); // Round to 2 decimals
        }
      } else if (preset.value !== 'fit') {
        setZoom(preset.value);
      }
    },
    [options, setZoom]
  );

  /**
   * Zoom in by 20%
   */
  const zoomIn = useCallback(() => {
    setZoom(Math.min(2, Number((zoom * 1.2).toFixed(2))));
  }, [zoom, setZoom]);

  /**
   * Zoom out by 20%
   */
  const zoomOut = useCallback(() => {
    setZoom(Math.max(0.1, Number((zoom / 1.2).toFixed(2))));
  }, [zoom, setZoom]);

  /**
   * Reset zoom to 100%
   */
  const resetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  return {
    zoom,
    setZoom,
    zoomPresets: ZOOM_PRESETS,
    handlePresetZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
