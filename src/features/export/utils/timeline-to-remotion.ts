import type { TimelineTrack, TimelineItem } from '@/types/timeline';
import type { RemotionInputProps } from '@/types/export';

/**
 * Convert timeline data to Remotion input props
 *
 * Since TimelineItem already follows Remotion's pattern (from, durationInFrames),
 * we just need to populate track.items with the filtered items.
 */
export function convertTimelineToRemotion(
  tracks: TimelineTrack[],
  items: TimelineItem[],
  fps: number
): RemotionInputProps {
  // Populate each track with its items
  const tracksWithItems: TimelineTrack[] = tracks.map(track => ({
    ...track,
    items: items.filter(item => item.trackId === track.id),
  }));

  return {
    fps,
    tracks: tracksWithItems,
  };
}
