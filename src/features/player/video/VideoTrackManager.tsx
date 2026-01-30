/**
 * VideoTrackManager.tsx - Multi-track video orchestration
 *
 * Manages multiple video elements for a multi-track timeline:
 * - Determines which videos are visible at the current frame
 * - Preloads videos ahead of the playhead
 * - Syncs all videos to the current frame
 * - Handles z-index layering
 * - Provides render props for custom item wrappers
 *
 * Architecture:
 * - Uses a "warm pool" approach: videos near the playhead are kept loaded
 * - Videos are shown/hidden via CSS visibility (keeps DOM stable)
 * - All visible videos are seeked in parallel when the frame changes
 */

import React, { useMemo, useCallback, useRef, memo } from 'react';
import type { VideoItemData, VideoTrackManagerProps } from './types';
import { VideoElement, type VideoElementHandle } from './VideoElement';

/**
 * Calculate which items are visible at a given frame
 */
function getVisibleItems(items: VideoItemData[], frame: number): VideoItemData[] {
  return items.filter((item) => {
    const start = item.from;
    const end = item.from + item.durationInFrames;
    return frame >= start && frame < end;
  });
}

/**
 * Calculate which items should be preloaded (near the playhead)
 */
function getPreloadItems(
  items: VideoItemData[],
  frame: number,
  aheadFrames: number,
  behindFrames: number
): VideoItemData[] {
  const rangeStart = frame - behindFrames;
  const rangeEnd = frame + aheadFrames;

  return items.filter((item) => {
    const itemStart = item.from;
    const itemEnd = item.from + item.durationInFrames;
    // Item overlaps with preload range
    return itemEnd >= rangeStart && itemStart <= rangeEnd;
  });
}

/**
 * Calculate the local time within a video item
 * (how far into the source video we should be)
 */
function calculateLocalTime(
  item: VideoItemData,
  globalFrame: number,
  fps: number
): number {
  // Frame position within this item
  const localFrame = globalFrame - item.from;

  // Convert to time in seconds
  const localTimeInTimeline = localFrame / fps;

  // Apply playback speed
  const speed = item.speed ?? 1;
  const sourceTime = localTimeInTimeline * speed;

  // Add source start offset
  const startOffset = item.sourceStart ?? 0;

  return startOffset + sourceTime;
}

/**
 * Individual video item wrapper
 */
interface VideoItemWrapperProps {
  item: VideoItemData;
  currentFrame: number;
  fps: number;
  isPlaying: boolean;
  playbackRate: number;
  isVisible: boolean;
  isPreloaded: boolean;
  onError?: (error: Error) => void;
  renderItem?: (item: VideoItemData, videoElement: React.ReactNode) => React.ReactNode;
}

const VideoItemWrapper = memo<VideoItemWrapperProps>(
  ({
    item,
    currentFrame,
    fps,
    isPlaying,
    playbackRate,
    isVisible,
    isPreloaded,
    onError,
    renderItem,
  }) => {
    const videoRef = useRef<VideoElementHandle>(null);

    // Calculate current time within the video
    const localTime = useMemo(() => {
      if (!isVisible) return 0;
      return calculateLocalTime(item, currentFrame, fps);
    }, [item, currentFrame, fps, isVisible]);

    // Calculate effective playback rate (item speed * global rate)
    const effectivePlaybackRate = (item.speed ?? 1) * playbackRate;

    // Calculate volume (convert from dB to linear)
    const volumeDb = item.volume ?? 0;
    const linearVolume = Math.pow(10, volumeDb / 20);

    // Create the video element
    const videoElement = (
      <VideoElement
        ref={videoRef}
        id={item.id}
        src={item.src}
        startTime={item.sourceStart ?? 0}
        currentTime={localTime - (item.sourceStart ?? 0)}
        isPlaying={isPlaying && isVisible}
        playbackRate={effectivePlaybackRate}
        volume={linearVolume}
        muted={item.muted ?? false}
        visible={isVisible}
        onError={onError}
      />
    );

    // Only render if preloaded (near playhead)
    if (!isPreloaded) {
      return null;
    }

    // Apply custom render function if provided
    if (renderItem) {
      return <>{renderItem(item, videoElement)}</>;
    }

    // Default render: absolute positioned with z-index
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: item.zIndex ?? 0,
          visibility: isVisible && (item.trackVisible ?? true) ? 'visible' : 'hidden',
        }}
      >
        {videoElement}
      </div>
    );
  }
);

VideoItemWrapper.displayName = 'VideoItemWrapper';

/**
 * VideoTrackManager Component
 *
 * Orchestrates multiple video elements for multi-track playback.
 */
export const VideoTrackManager = memo<VideoTrackManagerProps>(
  ({
    items,
    currentFrame,
    fps,
    isPlaying,
    playbackRate = 1,
    preloadAheadFrames = 150, // 5 seconds at 30fps
    preloadBehindFrames = 30, // 1 second at 30fps
    renderItem,
    onVideoError,
  }) => {
    // Track which items are currently visible
    const visibleItems = useMemo(
      () => getVisibleItems(items, currentFrame),
      [items, currentFrame]
    );

    // Track which items should be preloaded
    const preloadedItems = useMemo(
      () => getPreloadItems(items, currentFrame, preloadAheadFrames, preloadBehindFrames),
      [items, currentFrame, preloadAheadFrames, preloadBehindFrames]
    );

    // Create stable Set for visibility checks
    const visibleIds = useMemo(
      () => new Set(visibleItems.map((item) => item.id)),
      [visibleItems]
    );

    // Create stable Set for preload checks
    const preloadedIds = useMemo(
      () => new Set(preloadedItems.map((item) => item.id)),
      [preloadedItems]
    );

    // Error handler
    const handleError = useCallback(
      (itemId: string) => (error: Error) => {
        console.error(`[VideoTrackManager] Error in video ${itemId}:`, error);
        onVideoError?.(itemId, error);
      },
      [onVideoError]
    );

    // Sort items by z-index for proper layering (toSorted for immutability)
    const sortedItems = useMemo(
      () => items.toSorted((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
      [items]
    );

    return (
      <>
        {sortedItems.map((item) => (
          <VideoItemWrapper
            key={item.id}
            item={item}
            currentFrame={currentFrame}
            fps={fps}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            isVisible={visibleIds.has(item.id)}
            isPreloaded={preloadedIds.has(item.id)}
            onError={handleError(item.id)}
            renderItem={renderItem}
          />
        ))}
      </>
    );
  }
);

VideoTrackManager.displayName = 'VideoTrackManager';

/**
 * Hook to use VideoTrackManager state
 *
 * Provides information about video states without rendering.
 */
export function useVideoTrackState(
  items: VideoItemData[],
  currentFrame: number,
  preloadAheadFrames: number = 150,
  preloadBehindFrames: number = 30
) {
  const visibleItems = useMemo(
    () => getVisibleItems(items, currentFrame),
    [items, currentFrame]
  );

  const preloadedItems = useMemo(
    () => getPreloadItems(items, currentFrame, preloadAheadFrames, preloadBehindFrames),
    [items, currentFrame, preloadAheadFrames, preloadBehindFrames]
  );

  return {
    visibleItems,
    preloadedItems,
    visibleCount: visibleItems.length,
    preloadedCount: preloadedItems.length,
  };
}

export default VideoTrackManager;
