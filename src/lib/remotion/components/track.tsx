import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { TimelineTrack } from '@/types/timeline';
import { Item } from './item';

export interface TrackProps {
  track: TimelineTrack;
}

/**
 * Remotion Track Component
 *
 * Renders a single track with all its items using Remotion's Sequence component.
 * Following Remotion best practices from the guide:
 * - Each item is wrapped in a <Sequence> with `from` and `durationInFrames`
 * - Items are rendered in an <AbsoluteFill> so they overlay each other
 */
export const Track: React.FC<TrackProps> = ({ track }) => {
  return (
    <AbsoluteFill>
      {track.items.map((item) => {
        return (
          <Sequence
            key={item.id}
            from={item.from}
            durationInFrames={item.durationInFrames}
          >
            <Item item={item} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
