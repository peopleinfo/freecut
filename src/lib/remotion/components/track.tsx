import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import type { TimelineTrack } from '@/types/timeline';
import { Item } from './item';
import { generateStableKey } from '../utils/generate-stable-key';

export interface TrackProps {
  track: TimelineTrack;
  muted?: boolean;
}

/**
 * Remotion Track Component
 *
 * Renders a single track with all its items using Remotion's Sequence component.
 * Following Remotion best practices from the guide:
 * - Each item is wrapped in a <Sequence> with `from` and `durationInFrames`
 * - Items are rendered in an <AbsoluteFill> so they overlay each other
 * - Respects track mute state for audio/video items
 * - Uses stable keys based on source media to prevent remounting on split
 * - Pre-mounts media items 2 seconds early to ensure smooth transitions
 */
export const Track: React.FC<TrackProps> = ({ track, muted = false }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {track.items.map((item) => {
        // Pre-mount media items 2 seconds before they become visible
        const isMedia = item.type === 'video' || item.type === 'audio';
        const premountFrames = isMedia ? Math.round(fps * 2) : 0;

        return (
          <Sequence
            key={generateStableKey(item)}
            from={item.from}
            durationInFrames={item.durationInFrames}
            premountFor={premountFrames}
          >
            <Item item={item} muted={muted} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
