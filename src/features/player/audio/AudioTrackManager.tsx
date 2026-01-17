/**
 * AudioTrackManager.tsx - Multi-track audio orchestration
 *
 * Manages multiple audio elements for a multi-track timeline:
 * - Determines which audio items are active at the current frame
 * - Preloads audio ahead of the playhead
 * - Syncs all audio to the current frame
 * - Handles master volume and muting
 *
 * Architecture:
 * - Uses a "warm pool" approach: audio near the playhead is kept loaded
 * - Audio elements are created/destroyed based on preload range
 * - All active audio is seeked when the frame changes
 */

import { useMemo, useCallback, useRef, memo } from 'react';
import type { AudioItemData, AudioTrackManagerProps } from './types';
import { AudioElement, type AudioElementHandle } from './AudioElement';

/**
 * Calculate which items are active at a given frame
 */
function getActiveItems(items: AudioItemData[], frame: number): AudioItemData[] {
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
  items: AudioItemData[],
  frame: number,
  aheadFrames: number,
  behindFrames: number
): AudioItemData[] {
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
 * Calculate the local time within an audio item (in seconds)
 */
function calculateLocalTime(
  item: AudioItemData,
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

  return sourceTime;
}

/**
 * Individual audio item wrapper
 */
interface AudioItemWrapperProps {
  item: AudioItemData;
  currentFrame: number;
  fps: number;
  isPlaying: boolean;
  playbackRate: number;
  masterVolume: number;
  masterMuted: boolean;
  isActive: boolean;
  isPreloaded: boolean;
  onError?: (error: Error) => void;
}

const AudioItemWrapper = memo<AudioItemWrapperProps>(
  ({
    item,
    currentFrame,
    fps,
    isPlaying,
    playbackRate,
    masterVolume,
    masterMuted,
    isActive,
    isPreloaded,
    onError,
  }) => {
    const audioRef = useRef<AudioElementHandle>(null);

    // Calculate current time within the audio (in seconds)
    const localTime = useMemo(() => {
      if (!isActive) return 0;
      return calculateLocalTime(item, currentFrame, fps);
    }, [item, currentFrame, fps, isActive]);

    // Calculate effective playback rate
    const effectivePlaybackRate = (item.speed ?? 1) * playbackRate;

    // Calculate duration in seconds
    const durationInSeconds = item.durationInFrames / fps;

    // Calculate source start time in seconds
    const sourceStartSeconds = (item.sourceStart ?? 0) / fps;

    // Determine if this item should be muted
    const isMuted = masterMuted || item.muted || !item.trackVisible;

    // Calculate effective volume (item volume * master volume)
    const itemVolumeDb = item.volume ?? 0;
    // Master volume is 0-1, convert to dB adjustment
    const masterVolumeDb = masterVolume > 0 ? 20 * Math.log10(masterVolume) : -Infinity;
    // Final volume is sum of dB values (multiplication in linear domain)
    const effectiveVolumeDb = isMuted ? -Infinity : itemVolumeDb + (masterVolumeDb === -Infinity ? -60 : masterVolumeDb);

    // Only render if preloaded
    if (!isPreloaded) {
      return null;
    }

    return (
      <AudioElement
        ref={audioRef}
        id={item.id}
        src={item.src}
        startTime={sourceStartSeconds}
        currentTime={localTime}
        isPlaying={isPlaying && isActive}
        playbackRate={effectivePlaybackRate}
        volumeDb={effectiveVolumeDb}
        muted={isMuted}
        fadeIn={item.audioFadeIn ?? 0}
        fadeOut={item.audioFadeOut ?? 0}
        duration={durationInSeconds}
        preservePitch={true}
        onError={onError}
      />
    );
  }
);

AudioItemWrapper.displayName = 'AudioItemWrapper';

/**
 * AudioTrackManager Component
 *
 * Orchestrates multiple audio elements for multi-track playback.
 */
export const AudioTrackManager = memo<AudioTrackManagerProps>(
  ({
    items,
    currentFrame,
    fps,
    isPlaying,
    playbackRate = 1,
    masterVolume = 1,
    masterMuted = false,
    preloadAheadFrames = 150, // 5 seconds at 30fps
    preloadBehindFrames = 30, // 1 second at 30fps
    onAudioError,
  }) => {
    // Track which items are currently active
    const activeItems = useMemo(
      () => getActiveItems(items, currentFrame),
      [items, currentFrame]
    );

    // Track which items should be preloaded
    const preloadedItems = useMemo(
      () => getPreloadItems(items, currentFrame, preloadAheadFrames, preloadBehindFrames),
      [items, currentFrame, preloadAheadFrames, preloadBehindFrames]
    );

    // Create stable Set for active checks
    const activeIds = useMemo(
      () => new Set(activeItems.map((item) => item.id)),
      [activeItems]
    );

    // Create stable Set for preload checks
    const preloadedIds = useMemo(
      () => new Set(preloadedItems.map((item) => item.id)),
      [preloadedItems]
    );

    // Error handler
    const handleError = useCallback(
      (itemId: string) => (error: Error) => {
        console.error(`[AudioTrackManager] Error in audio ${itemId}:`, error);
        onAudioError?.(itemId, error);
      },
      [onAudioError]
    );

    return (
      <>
        {items.map((item) => (
          <AudioItemWrapper
            key={item.id}
            item={item}
            currentFrame={currentFrame}
            fps={fps}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            masterVolume={masterVolume}
            masterMuted={masterMuted}
            isActive={activeIds.has(item.id)}
            isPreloaded={preloadedIds.has(item.id)}
            onError={handleError(item.id)}
          />
        ))}
      </>
    );
  }
);

AudioTrackManager.displayName = 'AudioTrackManager';

/**
 * Hook to use AudioTrackManager state
 *
 * Provides information about audio states without rendering.
 */
export function useAudioTrackState(
  items: AudioItemData[],
  currentFrame: number,
  preloadAheadFrames: number = 150,
  preloadBehindFrames: number = 30
) {
  const activeItems = useMemo(
    () => getActiveItems(items, currentFrame),
    [items, currentFrame]
  );

  const preloadedItems = useMemo(
    () => getPreloadItems(items, currentFrame, preloadAheadFrames, preloadBehindFrames),
    [items, currentFrame, preloadAheadFrames, preloadBehindFrames]
  );

  return {
    activeItems,
    preloadedItems,
    activeCount: activeItems.length,
    preloadedCount: preloadedItems.length,
  };
}

export default AudioTrackManager;
