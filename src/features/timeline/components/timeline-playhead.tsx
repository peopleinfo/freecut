import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { useTimelineZoom } from '../hooks/use-timeline-zoom';

export interface TimelinePlayheadProps {
  inRuler?: boolean; // If true, shows diamond indicator for ruler
}

/**
 * Timeline Playhead Component
 *
 * Renders the playhead indicator that shows the current frame position
 * - Vertical line across all tracks
 * - Diamond indicator in ruler when inRuler=true
 * - Synchronized with playback store
 */
export function TimelinePlayhead({ inRuler = false }: TimelinePlayheadProps) {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const { frameToPixels } = useTimelineZoom();

  const leftPosition = frameToPixels(currentFrame);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 playhead pointer-events-none z-20"
      style={{ left: `${leftPosition}px` }}
    >
      {inRuler && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 playhead rotate-45 rounded-sm" />
      )}
    </div>
  );
}
