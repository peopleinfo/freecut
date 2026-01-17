/**
 * use-playback.ts - Animation loop for FreeCut Player
 * 
 * Handles the playback animation using requestAnimationFrame/setTimeout
 * with support for:
 * - Frame-accurate playback based on time calculations
 * - Variable playback rates
 * - Loop handling
 * - Visibility changes (tab backgrounding)
 * - Buffering detection
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePlayer, UsePlayerMethods } from './use-player';
import {
  useBridgedTimelineContext,
  useBridgedSetTimelineContext,
  useBridgedActualLastFrame,
  useBridgedActualFirstFrame,
} from './clock';

/**
 * Calculate the next frame based on elapsed time
 * 
 * @param params - Calculation parameters
 * @returns Object with next frame, frames advanced, and hasEnded flag
 */
export function calculateNextFrame({
  time,
  currentFrame: startFrame,
  playbackSpeed,
  fps,
  actualLastFrame,
  actualFirstFrame,
  framesAdvanced,
  shouldLoop,
}: {
  time: number;
  currentFrame: number;
  playbackSpeed: number;
  fps: number;
  actualFirstFrame: number;
  actualLastFrame: number;
  framesAdvanced: number;
  shouldLoop: boolean;
}): { nextFrame: number; framesToAdvance: number; hasEnded: boolean } {
  // Calculate frames to advance based on time and playback speed
  const op = playbackSpeed < 0 ? Math.ceil : Math.floor;
  const framesToAdvance =
    op((time * playbackSpeed) / (1000 / fps)) - framesAdvanced;

  const nextFrame = framesToAdvance + startFrame;

  // Check if current or next frame is outside the valid range
  const isCurrentFrameOutside =
    startFrame > actualLastFrame || startFrame < actualFirstFrame;
  const isNextFrameOutside =
    nextFrame > actualLastFrame || nextFrame < actualFirstFrame;

  // Has ended if not looping and next frame is outside range
  const hasEnded = !shouldLoop && isNextFrameOutside && !isCurrentFrameOutside;

  // Handle forward playback
  if (playbackSpeed > 0) {
    if (isNextFrameOutside) {
      return {
        nextFrame: shouldLoop ? actualFirstFrame : startFrame,
        framesToAdvance,
        hasEnded,
      };
    }
    return { nextFrame, framesToAdvance, hasEnded };
  }

  // Handle reverse playback
  if (isNextFrameOutside) {
    return {
      nextFrame: shouldLoop ? actualLastFrame : startFrame,
      framesToAdvance,
      hasEnded,
    };
  }

  return { nextFrame, framesToAdvance, hasEnded };
}

/**
 * Hook to manage the playback animation loop
 */
export function usePlayback(
  durationInFrames: number,
  options: {
    loop?: boolean;
    playbackRate?: number;
    inFrame?: number | null;
    outFrame?: number | null;
    onEnded?: () => void;
  } = {},
): UsePlayerMethods {
  // inFrame and outFrame are reserved for future use (timeline range restrictions)
  const { loop = false, playbackRate = 1, inFrame: _inFrame = null, outFrame: _outFrame = null, onEnded } = options;

  // Get player methods
  const player = usePlayer(durationInFrames, { loop, onEnded });

  // Get timeline context
  const { playing, imperativePlaying } = useBridgedTimelineContext();
  const { setPlaying } = useBridgedSetTimelineContext();

  // Get boundaries
  const lastFrame = useBridgedActualLastFrame(durationInFrames);
  const firstFrame = useBridgedActualFirstFrame();

  // Refs for animation
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const framesAdvancedRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);

  // Check if tab is backgrounded
  const isBackgroundedRef = useRef(false);

  /**
   * Handle visibility change - switch to setTimeout when tab is hidden
   */
  const handleVisibilityChange = useCallback(() => {
    isBackgroundedRef.current = document.visibilityState !== 'visible';
  }, []);

  /**
   * Cancel any pending animation frame
   */
  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Animation callback
   */
  const animationCallback = useCallback(() => {
    if (!imperativePlaying.current) {
      return;
    }

    const time = performance.now() - startTimeRef.current;
    const currentFrame = player.getCurrentFrame();

    const { nextFrame, hasEnded } = calculateNextFrame({
      time,
      currentFrame,
      playbackSpeed: playbackRate,
      fps: 30, // Default FPS, should be configurable
      actualFirstFrame: firstFrame,
      actualLastFrame: lastFrame,
      framesAdvanced: framesAdvancedRef.current,
      shouldLoop: loop,
    });

    framesAdvancedRef.current += nextFrame - currentFrame;

    // Update frame if changed
    if (nextFrame !== currentFrame) {
      player.seek(nextFrame);
    }

    // Dispatch time update periodically
    const now = performance.now();
    if (now - lastTimeUpdateRef.current >= 100) {
      player.emitter.dispatchTimeUpdate(nextFrame);
      lastTimeUpdateRef.current = now;
    }

    // Handle end of playback
    if (hasEnded) {
      cancelAnimation();
      imperativePlaying.current = false;
      setPlaying(false);

      if (loop) {
        // Restart from beginning
        startTimeRef.current = performance.now();
        framesAdvancedRef.current = 0;
        player.seek(firstFrame);
        queueNextFrame();
      } else {
        player.emitter.dispatchEnded();
        onEnded?.();
      }
      return;
    }

    // Queue next frame
    queueNextFrame();
  }, [imperativePlaying, player, playbackRate, firstFrame, lastFrame, loop, onEnded, cancelAnimation, setPlaying]);

  /**
   * Queue the next animation frame
   */
  const queueNextFrame = useCallback(() => {
    if (!imperativePlaying.current) {
      return;
    }

    if (isBackgroundedRef.current) {
      // Use setTimeout when backgrounded (raf doesn't run)
      // Note: Most likely this will not be 1000/fps, but the browser will throttle it
      timeoutRef.current = setTimeout(animationCallback, 1000 / 30);
    } else {
      // Use requestAnimationFrame when active
      animationRef.current = requestAnimationFrame(animationCallback);
    }
  }, [imperativePlaying, animationCallback]);

  /**
   * Start playback
   */
  const startPlayback = useCallback(() => {
    startTimeRef.current = performance.now();
    framesAdvancedRef.current = 0;
    lastTimeUpdateRef.current = performance.now();
    queueNextFrame();
  }, [queueNextFrame]);

  /**
   * Stop playback
   */
  const stopPlayback = useCallback(() => {
    cancelAnimation();
  }, [cancelAnimation]);

  // Set up visibility change listener
  useEffect(() => {
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Handle play/pause state changes
  useEffect(() => {
    if (playing && !imperativePlaying.current) {
      // Started playing
      startPlayback();
    } else if (!playing && imperativePlaying.current) {
      // Stopped playing
      stopPlayback();
    }
  }, [playing, imperativePlaying, startPlayback, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  return player;
}

/**
 * Hook to get the current frame imperatively
 * Used by the playback loop to avoid react state overhead
 */
export function useGetCurrentFrame(): () => number {
  const { frame } = useBridgedTimelineContext();
  const frameRef = useRef(frame);
  
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);
  
  return () => frameRef.current;
}
