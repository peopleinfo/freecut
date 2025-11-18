import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { RemotionInputProps } from '@/types/export';
import { Track } from '../components/track';

/**
 * Main Remotion Composition
 *
 * Renders all tracks following Remotion best practices:
 * - Each track is rendered in an <AbsoluteFill> container
 * - Tracks overlay each other (like layers in video editing)
 * - Items within tracks use <Sequence> for timing
 * - Only renders visible tracks (respects track.visible flag)
 * - Solo mode: When any track has solo=true, only solo'd tracks are rendered
 */
export const MainComposition: React.FC<RemotionInputProps> = ({ tracks }) => {
  // Check if any track is solo'd
  const hasSoloTracks = tracks.some((track) => track.solo);

  return (
    <AbsoluteFill>
      {tracks
        .filter((track) => {
          // If any track is solo'd, only render solo tracks
          if (hasSoloTracks) {
            return track.solo;
          }
          // Otherwise, respect the visible flag
          return track.visible !== false;
        })
        .map((track) => (
          <Track
            key={track.id}
            track={track}
            muted={track.muted}
          />
        ))}
    </AbsoluteFill>
  );
};
