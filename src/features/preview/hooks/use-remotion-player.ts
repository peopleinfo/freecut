import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PlayerRef } from '@remotion/player';
import { usePlaybackStore } from '../stores/playback-store';

/**
 * Hook for integrating Remotion Player with timeline playback state
 *
 * Sync strategy:
 * - Timeline seeks trigger Player seeks (both playing and paused)
 * - Player updates are ignored briefly after seeks to prevent loops
 * - Player fires frameupdate → updates timeline scrubber position
 * - Play/pause state is synced bidirectionally
 * - Store is authoritative - if store says paused, Player follows
 *
 * @param playerRef - Ref to the Remotion Player instance
 * @returns Player sync handlers and current playback state
 */
export function useRemotionPlayer(playerRef: RefObject<PlayerRef>) {
  // Granular selectors
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);

  // Buffering state for UI feedback
  const [isBuffering, setIsBuffering] = useState(false);

  // Refs for tracking state without causing re-renders
  const lastSyncedFrameRef = useRef<number>(0);
  const ignorePlayerUpdatesRef = useRef<boolean>(false);
  const wasPlayingRef = useRef(isPlaying);

  /**
   * Timeline → Player: Sync play/pause state
   */
  useEffect(() => {
    if (!playerRef.current) return;

    const wasPlaying = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;

    try {
      if (isPlaying && !wasPlaying) {
        playerRef.current.play();
      } else if (!isPlaying && wasPlaying) {
        playerRef.current.pause();
      }
    } catch (error) {
      console.error('[Remotion Sync] Failed to control playback:', error);
    }
  }, [isPlaying, playerRef]);

  /**
   * Timeline → Player: Sync frame position (scrubbing and seeking)
   * Works both when paused AND when playing
   */
  useEffect(() => {
    if (!playerRef.current) return;

    // Check if this is a user-initiated seek (not from Player feedback)
    const frameDiff = Math.abs(currentFrame - lastSyncedFrameRef.current);
    if (frameDiff === 0) {
      return; // Already in sync, no need to seek
    }

    // During playback, ignore single-frame increments (normal playback progression)
    // Only seek if user jumped more than 1 frame (actual seek/scrub)
    if (isPlaying && frameDiff === 1) {
      lastSyncedFrameRef.current = currentFrame;
      return;
    }

    // Update lastSyncedFrame IMMEDIATELY to prevent pause handler from
    // overwriting user-initiated seeks (e.g., clicking on ruler while playing)
    lastSyncedFrameRef.current = currentFrame;

    // Ignore Player updates during seek
    ignorePlayerUpdatesRef.current = true;

    try {
      const handleSeeked = () => {
        // After seek completes, trust whatever frame Player is at
        const actualFrame = playerRef.current?.getCurrentFrame();
        if (actualFrame !== undefined) {
          lastSyncedFrameRef.current = actualFrame;
        }

        // Re-enable Player updates
        requestAnimationFrame(() => {
          ignorePlayerUpdatesRef.current = false;
        });

        playerRef.current?.removeEventListener('seeked', handleSeeked);
      };

      playerRef.current.addEventListener('seeked', handleSeeked);
      playerRef.current.seekTo(currentFrame);
    } catch (error) {
      console.error('Failed to seek Remotion Player:', error);
      ignorePlayerUpdatesRef.current = false;
    }
  }, [currentFrame, playerRef, isPlaying]);

  /**
   * Player → Timeline: Listen to frameupdate events
   * Updates timeline scrubber as video plays
   */
  useEffect(() => {
    if (!playerRef.current) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      // Ignore updates right after we seeked
      if (ignorePlayerUpdatesRef.current) {
        return;
      }

      const newFrame = e.detail.frame;

      // Only update if frame actually changed
      if (newFrame !== lastSyncedFrameRef.current) {
        lastSyncedFrameRef.current = newFrame;
        setCurrentFrame(newFrame);
      }
    };

    playerRef.current.addEventListener('frameupdate', handleFrameUpdate);

    return () => {
      playerRef.current?.removeEventListener('frameupdate', handleFrameUpdate);
    };
  }, [setCurrentFrame, playerRef]);

  /**
   * Player → Timeline: Sync play/pause/ended state from Player
   * Handles cases where Player changes state on its own (buffering, errors, end of playback)
   */
  useEffect(() => {
    if (!playerRef.current) return;

    const { pause } = usePlaybackStore.getState();

    const handlePlayerPlay = () => {
      const storeIsPlaying = usePlaybackStore.getState().isPlaying;

      // If store says we're paused, the store is authoritative
      // Force player back to paused state to match store
      if (!storeIsPlaying) {
        try {
          playerRef.current?.pause();
        } catch (e) {
          // Ignore
        }
        return;
      }

      // Player started playing and store agrees - ensure refs are synced
      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true;
      }
    };

    const handlePlayerPause = () => {
      // Only attempt resume if we think we're playing
      // This handles Remotion's internal pause/play cycles during buffering/VFR correction
      if (wasPlayingRef.current) {
        try {
          setTimeout(() => {
            const stillWantsToPlay = usePlaybackStore.getState().isPlaying;
            if (stillWantsToPlay && playerRef.current) {
              playerRef.current.play();
            }
          }, 50);
        } catch (e) {
          // If resume fails, sync the pause
          wasPlayingRef.current = false;
          pause();
        }
      }
    };

    const handlePlayerEnded = () => {
      wasPlayingRef.current = false;
      pause();
    };

    const handlePlayerError = (e: Event) => {
      console.error('[Remotion Sync] Player error:', e);
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        pause();
      }
    };

    // Buffering state events
    const handlePlayerWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlayerResume = () => {
      setIsBuffering(false);
    };

    playerRef.current.addEventListener('play', handlePlayerPlay);
    playerRef.current.addEventListener('pause', handlePlayerPause);
    playerRef.current.addEventListener('ended', handlePlayerEnded);
    playerRef.current.addEventListener('error', handlePlayerError);
    playerRef.current.addEventListener('waiting', handlePlayerWaiting);
    playerRef.current.addEventListener('resume', handlePlayerResume);

    return () => {
      playerRef.current?.removeEventListener('play', handlePlayerPlay);
      playerRef.current?.removeEventListener('pause', handlePlayerPause);
      playerRef.current?.removeEventListener('ended', handlePlayerEnded);
      playerRef.current?.removeEventListener('error', handlePlayerError);
      playerRef.current?.removeEventListener('waiting', handlePlayerWaiting);
      playerRef.current?.removeEventListener('resume', handlePlayerResume);
    };
  }, [playerRef]);

  return {
    isPlaying,
    currentFrame,
    isBuffering,
  };
}
