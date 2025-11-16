import { TimelineMarkers } from './timeline-markers';
import { TimelinePlayhead } from './timeline-playhead';
import { TimelineTrack } from './timeline-track';
import { useTimelineStore } from '../stores/timeline-store';

export interface TimelineContentProps {
  duration: number; // Total timeline duration in seconds
}

/**
 * Timeline Content Component
 *
 * Main timeline rendering area that composes:
 * - TimelineMarkers (time ruler)
 * - TimelinePlayhead (in ruler)
 * - TimelineTracks (all tracks with clips)
 * - TimelinePlayhead (through tracks)
 */
export function TimelineContent({ duration }: TimelineContentProps) {
  // Use granular selectors - Zustand v5 best practice
  const tracks = useTimelineStore((s) => s.tracks);
  const clips = useTimelineStore((s) => s.clips);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-background/30">
      {/* Time Ruler */}
      <div className="relative">
        <TimelineMarkers duration={duration} />
        <TimelinePlayhead inRuler />
      </div>

      {/* Track lanes */}
      <div className="relative">
        {tracks.map((track) => (
          <TimelineTrack key={track.id} track={track} clips={clips} />
        ))}

        {/* Playhead line through all tracks */}
        <TimelinePlayhead />
      </div>
    </div>
  );
}
