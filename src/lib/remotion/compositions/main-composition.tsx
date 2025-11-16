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
 */
export const MainComposition: React.FC<RemotionInputProps> = ({ tracks }) => {
  return (
    <AbsoluteFill>
      {tracks.map((track) => (
        <Track key={track.id} track={track} />
      ))}
    </AbsoluteFill>
  );
};
