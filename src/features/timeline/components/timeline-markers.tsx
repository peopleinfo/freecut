import { useTimelineZoom } from '../hooks/use-timeline-zoom';
import { useTimelineStore } from '../stores/timeline-store';

export interface TimelineMarkersProps {
  duration: number; // Total timeline duration in seconds
}

/**
 * Timeline Markers Component
 *
 * Renders the time ruler with:
 * - Second markers with labels
 * - Frame tick marks
 * - Responsive to zoom level
 */
export function TimelineMarkers({ duration }: TimelineMarkersProps) {
  const { timeToPixels } = useTimelineZoom();

  // Calculate number of seconds to show
  const seconds = Math.ceil(duration) + 1;

  return (
    <div className="h-11 bg-secondary/20 border-b border-border relative">
      {/* Time markers */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: seconds }).map((_, i) => {
          const width = timeToPixels(1); // Width of 1 second

          return (
            <div
              key={i}
              className="flex-shrink-0 border-l border-border/50 relative"
              style={{ width: `${width}px` }}
            >
              {/* Second label */}
              <span className="absolute top-2 left-2 font-mono text-xs text-muted-foreground tabular-nums">
                {i}s
              </span>

              {/* Frame ticks */}
              <div className="absolute top-7 left-0 right-0 flex justify-between px-0.5">
                {Array.from({ length: 10 }).map((_, j) => (
                  <div key={j} className="w-px h-1.5 bg-border/40" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
