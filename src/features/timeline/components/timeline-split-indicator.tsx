import { useTimelineZoom } from '../hooks/use-timeline-zoom';
import { useTimelineStore } from '../stores/timeline-store';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';

export interface TimelineSplitIndicatorProps {
  /** X position in pixels relative to timeline container */
  cursorX: number | null;
}

// Snap threshold in pixels
const SNAP_THRESHOLD_PX = 10;

/**
 * Timeline Split Indicator Component
 *
 * Renders a vertical red line at the cursor position when in razor mode.
 * Positioned above the playhead (z-index > 9999) so it's always visible.
 * Snaps to frame boundaries and playhead position for precise cuts.
 */
export function TimelineSplitIndicator({ cursorX }: TimelineSplitIndicatorProps) {
  const { pixelsToFrame, frameToPixels } = useTimelineZoom();
  const fps = useTimelineStore((s) => s.fps);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  if (cursorX === null) return null;

  // Get playhead position in pixels
  const playheadX = frameToPixels(currentFrame);

  // Check if cursor is near playhead (snap to playhead)
  // Don't snap to playhead when video is playing - it moves too fast
  const distanceToPlayhead = Math.abs(cursorX - playheadX);
  const shouldSnapToPlayhead = !isPlaying && distanceToPlayhead <= SNAP_THRESHOLD_PX;

  let snappedX: number;

  if (shouldSnapToPlayhead) {
    // Snap to playhead
    snappedX = playheadX;
  } else {
    // Snap to nearest frame boundary
    const frameAtCursor = pixelsToFrame(cursorX);
    const snappedFrame = Math.round(frameAtCursor * fps) / fps;
    snappedX = frameToPixels(snappedFrame);
  }

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
      style={{
        left: `${snappedX}px`,
        zIndex: 10000, // Above playhead (9999)
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
      }}
    />
  );
}
