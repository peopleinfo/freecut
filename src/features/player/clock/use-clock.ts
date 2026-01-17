/**
 * use-clock.ts - Additional clock hooks and utilities
 *
 * This file provides convenience hooks built on top of the core
 * clock context hooks. These are common patterns that many
 * components might need.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useClock, useClockFrame, useClockIsPlaying } from './ClockContext';
import type { Clock, ClockEvent } from './Clock';

/**
 * useFrameCallback - Run a callback on every frame during playback
 *
 * The callback receives the current frame number. This is useful
 * for effects that need to run in sync with playback but don't
 * need to cause React re-renders.
 *
 * @param callback - Function to call on each frame
 * @param deps - Dependencies array for the callback
 */
export function useFrameCallback(
  callback: (frame: number, clock: Clock) => void,
  deps: React.DependencyList = []
): void {
  const clock = useClock();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    const handler = (event: ClockEvent) => {
      callbackRef.current(event.frame, clock);
    };

    clock.addEventListener('framechange', handler);
    return () => {
      clock.removeEventListener('framechange', handler);
    };
  }, [clock]);
}

/**
 * useThrottledFrame - Get the current frame, but throttled to reduce renders
 *
 * During playback, updates are throttled to the specified interval.
 * When paused/scrubbing, updates are immediate.
 *
 * @param throttleMs - Minimum milliseconds between updates during playback
 * @returns Current frame number
 */
export function useThrottledFrame(throttleMs: number = 100): number {
  const clock = useClock();
  const frameRef = useRef(clock.currentFrame);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // State to trigger re-renders
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const handler = () => {
      const now = performance.now();
      const newFrame = clock.currentFrame;

      // Always update immediately when paused
      if (!clock.isPlaying) {
        if (frameRef.current !== newFrame) {
          frameRef.current = newFrame;
          forceUpdate();
        }
        return;
      }

      // During playback, throttle updates
      if (now - lastUpdateRef.current >= throttleMs) {
        if (frameRef.current !== newFrame) {
          frameRef.current = newFrame;
          lastUpdateRef.current = now;
          forceUpdate();
        }
      }
    };

    clock.addEventListener('framechange', handler);
    clock.addEventListener('seek', handler);

    return () => {
      clock.removeEventListener('framechange', handler);
      clock.removeEventListener('seek', handler);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [clock, throttleMs]);

  return frameRef.current;
}

// Need to import useReducer
import { useReducer } from 'react';

/**
 * useIsFrameInRange - Check if a given frame range is visible
 *
 * Useful for determining if a timeline item should be rendered
 * based on the current frame position.
 *
 * @param from - Start frame of the range
 * @param durationInFrames - Duration of the range in frames
 * @returns Whether the current frame is within the range
 */
export function useIsFrameInRange(from: number, durationInFrames: number): boolean {
  const currentFrame = useClockFrame();
  return currentFrame >= from && currentFrame < from + durationInFrames;
}

/**
 * useLocalFrame - Get the local frame within a sequence
 *
 * Given a sequence start frame and the global current frame,
 * returns the local frame number (0-based within the sequence).
 *
 * @param sequenceFrom - The start frame of the sequence
 * @returns Local frame number (global frame - sequence start)
 */
export function useLocalFrame(sequenceFrom: number): number {
  const currentFrame = useClockFrame();
  return Math.max(0, currentFrame - sequenceFrom);
}

/**
 * usePlayPause - Simple hook for play/pause button
 *
 * Returns the playing state and a toggle function.
 * Optimized to minimize re-renders.
 */
export function usePlayPause(): [boolean, () => void] {
  const clock = useClock();
  const isPlaying = useClockIsPlaying();
  const toggle = useCallback(() => clock.toggle(), [clock]);
  return [isPlaying, toggle];
}

/**
 * useSeek - Hook for seeking with various input types
 *
 * Returns functions for seeking by frame, time, or percentage.
 */
export function useSeek() {
  const clock = useClock();

  const seekToFrame = useCallback(
    (frame: number) => clock.seekToFrame(frame),
    [clock]
  );

  const seekToTime = useCallback(
    (time: number) => clock.seekToTime(time),
    [clock]
  );

  const seekToPercent = useCallback(
    (percent: number) => {
      const frame = Math.round((percent / 100) * (clock.durationInFrames - 1));
      clock.seekToFrame(frame);
    },
    [clock]
  );

  return { seekToFrame, seekToTime, seekToPercent };
}

/**
 * useProgress - Get playback progress as a percentage
 *
 * @returns Progress from 0 to 100
 */
export function useProgress(): number {
  const clock = useClock();
  const currentFrame = useClockFrame();

  if (clock.durationInFrames <= 1) {
    return 0;
  }

  return (currentFrame / (clock.durationInFrames - 1)) * 100;
}

/**
 * useAtBoundary - Check if at the start or end of playback
 */
export function useAtBoundary(): { atStart: boolean; atEnd: boolean } {
  const clock = useClock();
  const currentFrame = useClockFrame();

  return {
    atStart: currentFrame <= clock.actualFirstFrame,
    atEnd: currentFrame >= clock.actualLastFrame,
  };
}

/**
 * useClockConfig - Get clock configuration values
 *
 * Returns static configuration that doesn't change often.
 * Useful for calculations that need fps or duration.
 */
export function useClockConfig() {
  const clock = useClock();

  return {
    fps: clock.fps,
    durationInFrames: clock.durationInFrames,
    durationInSeconds: clock.durationInSeconds,
    actualFirstFrame: clock.actualFirstFrame,
    actualLastFrame: clock.actualLastFrame,
  };
}

/**
 * useSyncWithExternalTime - Sync clock with an external time source
 *
 * Useful for syncing with video elements or audio contexts.
 * Call the returned function whenever the external time changes.
 *
 * @returns Function to call with external time in seconds
 */
export function useSyncWithExternalTime(): (externalTime: number) => void {
  const clock = useClock();
  const lastSyncRef = useRef<number>(0);

  return useCallback(
    (externalTime: number) => {
      const externalFrame = clock.timeToFrame(externalTime);
      const drift = Math.abs(externalFrame - clock.currentFrame);

      // Only sync if drift exceeds threshold (1 frame)
      // This prevents jitter from small timing differences
      if (drift > 1) {
        clock.seekToFrame(externalFrame);
        lastSyncRef.current = performance.now();
      }
    },
    [clock]
  );
}
