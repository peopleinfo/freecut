/**
 * NativeVideoLayer.tsx - Native video rendering layer using custom VideoTrackManager
 *
 * This component provides an alternative to Remotion's video rendering,
 * using HTMLVideoElement directly for better control over playback.
 *
 * Features:
 * - Frame-accurate seeking via requestVideoFrameCallback
 * - Web Audio API for volume boost (>1x)
 * - Preloading for smooth playback
 * - Works with the Clock system for timing
 *
 * Usage:
 * Replace StableVideoSequence with NativeVideoLayer in MainComposition
 * when you want to use native video rendering instead of Remotion.
 */

import React, { useMemo, useCallback } from 'react';
import { VideoTrackManager } from './VideoTrackManager';
import type { VideoItemData } from './types';
import type { VideoItem } from '@/types/timeline';

/**
 * Enriched video item from MainComposition
 */
type EnrichedVideoItem = VideoItem & {
  zIndex: number;
  muted: boolean;
  trackOrder: number;
  trackVisible: boolean;
};

interface NativeVideoLayerProps {
  /** All video items to render */
  items: EnrichedVideoItem[];
  /** Current frame position */
  currentFrame: number;
  /** Timeline FPS */
  fps: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback rate */
  playbackRate?: number;
  /** Number of frames to preload ahead (default: 5 seconds) */
  preloadAheadFrames?: number;
  /** Number of frames to keep loaded behind (default: 1 second) */
  preloadBehindFrames?: number;
  /** Called when a video encounters an error */
  onVideoError?: (itemId: string, error: Error) => void;
}

/**
 * Convert EnrichedVideoItem to VideoItemData for VideoTrackManager
 */
function convertToVideoItemData(item: EnrichedVideoItem): VideoItemData {
  return {
    id: item.id,
    src: item.src ?? '',
    from: item.from,
    durationInFrames: item.durationInFrames,
    sourceStart: item.sourceStart,
    sourceEnd: item.sourceEnd,
    sourceDuration: item.sourceDuration,
    speed: item.speed,
    volume: item.volume,
    audioFadeIn: item.audioFadeIn,
    audioFadeOut: item.audioFadeOut,
    muted: item.muted,
    zIndex: item.zIndex,
    trackOrder: item.trackOrder,
    trackVisible: item.trackVisible,
  };
}

/**
 * NativeVideoLayer Component
 *
 * A drop-in replacement for StableVideoSequence that uses native
 * HTMLVideoElement rendering instead of Remotion's OffthreadVideo.
 */
export const NativeVideoLayer: React.FC<NativeVideoLayerProps> = ({
  items,
  currentFrame,
  fps,
  isPlaying,
  playbackRate = 1,
  preloadAheadFrames,
  preloadBehindFrames,
  onVideoError,
}) => {
  // Convert items to VideoItemData format
  const videoItems = useMemo(
    () => items.filter((item) => item.src).map(convertToVideoItemData),
    [items]
  );

  // Custom render function to apply transforms and effects
  const renderItem = useCallback(
    (item: VideoItemData, videoElement: React.ReactNode) => {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: item.zIndex ?? 0,
            visibility: item.trackVisible ? 'visible' : 'hidden',
            // GPU layer hints for smooth transitions
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {videoElement}
        </div>
      );
    },
    []
  );

  return (
    <VideoTrackManager
      items={videoItems}
      currentFrame={currentFrame}
      fps={fps}
      isPlaying={isPlaying}
      playbackRate={playbackRate}
      preloadAheadFrames={preloadAheadFrames}
      preloadBehindFrames={preloadBehindFrames}
      renderItem={renderItem}
      onVideoError={onVideoError}
    />
  );
};

NativeVideoLayer.displayName = 'NativeVideoLayer';

export default NativeVideoLayer;
