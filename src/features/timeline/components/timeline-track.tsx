import type { TimelineTrack, TimelineItem as TimelineItemType } from '@/types/timeline';
import { TimelineItem } from './timeline-item';

export interface TimelineTrackProps {
  track: TimelineTrack;
  items: TimelineItemType[];
}

/**
 * Timeline Track Component
 *
 * Renders a single timeline track with:
 * - All items belonging to this track
 * - Appropriate height based on track settings
 * - Generic container that accepts any item types
 */
export function TimelineTrack({ track, items }: TimelineTrackProps) {
  // Filter items for this track
  const trackItems = items.filter((item) => item.trackId === track.id);

  return (
    <div
      className="border-b border-border relative"
      style={{ height: `${track.height}px` }}
    >
      {/* Render all items for this track */}
      {trackItems.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
}
