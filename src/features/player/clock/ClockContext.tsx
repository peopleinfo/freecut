/**
 * ClockContext.tsx - React context for the Clock system
 *
 * Provides the Clock instance to React components via context.
 * Also bridges the imperative Clock API with React's reactive state
 * when components need to re-render on clock changes.
 *
 * Usage patterns:
 * 1. useClock() - Get the Clock instance for imperative control
 * 2. useClockState() - Get reactive state that triggers re-renders
 * 3. useClockFrame() - Get just the current frame (optimized)
 */

import React, {
  createContext,
  useContext,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Clock, createClock, type ClockConfig, type ClockEvent } from './Clock';

// ============================================
// Context Types
// ============================================

interface ClockContextValue {
  clock: Clock;
}

interface ClockProviderProps {
  children: ReactNode;
  fps: number;
  durationInFrames: number;
  initialFrame?: number;
  loop?: boolean;
  onEnded?: () => void;
  /**
   * Optional external clock instance.
   * If provided, the provider will use this clock instead of creating one.
   * Useful for sharing a clock between multiple providers or testing.
   */
  clock?: Clock;
}

// ============================================
// Context
// ============================================

const ClockContext = createContext<ClockContextValue | null>(null);

// ============================================
// Provider Component
// ============================================

/**
 * ClockProvider - Provides a Clock instance to the component tree
 *
 * Creates and manages a Clock instance. The clock is created once
 * and configuration updates are applied imperatively to avoid
 * recreating the clock and losing state.
 */
export function ClockProvider({
  children,
  fps,
  durationInFrames,
  initialFrame = 0,
  loop = false,
  onEnded,
  clock: externalClock,
}: ClockProviderProps): React.ReactElement {
  // Create clock instance once (or use external clock)
  const clockRef = useRef<Clock | null>(null);

  if (clockRef.current === null) {
    if (externalClock) {
      clockRef.current = externalClock;
    } else {
      const config: ClockConfig = {
        fps,
        durationInFrames,
        initialFrame,
        loop,
        onEnded,
      };
      clockRef.current = createClock(config);
    }
  }

  const clock = clockRef.current;

  // Update clock configuration when props change (without recreating)
  // This allows the clock to adapt to timeline changes
  React.useEffect(() => {
    if (clock.fps !== fps) {
      clock.fps = fps;
    }
  }, [clock, fps]);

  React.useEffect(() => {
    if (clock.durationInFrames !== durationInFrames) {
      clock.durationInFrames = durationInFrames;
    }
  }, [clock, durationInFrames]);

  React.useEffect(() => {
    if (clock.loop !== loop) {
      clock.loop = loop;
    }
  }, [clock, loop]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Only dispose if we created the clock (not external)
      if (!externalClock) {
        clock.dispose();
      }
    };
  }, [clock, externalClock]);

  const contextValue = useMemo(
    () => ({
      clock,
    }),
    [clock]
  );

  return (
    <ClockContext.Provider value={contextValue}>
      {children}
    </ClockContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * useClock - Get the Clock instance for imperative control
 *
 * Use this when you need to call methods on the clock directly:
 * - clock.play()
 * - clock.pause()
 * - clock.seekToFrame(frame)
 *
 * This hook does NOT cause re-renders when the clock state changes.
 */
export function useClock(): Clock {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within a ClockProvider');
  }
  return context.clock;
}

/**
 * useClockState - Get reactive clock state that triggers re-renders
 *
 * Use this when your component needs to display clock state:
 * - Current frame/time
 * - Playing state
 * - Playback rate
 *
 * Uses useSyncExternalStore for optimal performance and
 * concurrent mode compatibility.
 */
export function useClockState(): ClockEvent {
  const clock = useClock();

  const subscribe = useCallback(
    (callback: () => void) => {
      // Subscribe to all relevant events
      clock.addEventListener('framechange', callback);
      clock.addEventListener('play', callback);
      clock.addEventListener('pause', callback);
      clock.addEventListener('seek', callback);
      clock.addEventListener('ratechange', callback);

      return () => {
        clock.removeEventListener('framechange', callback);
        clock.removeEventListener('play', callback);
        clock.removeEventListener('pause', callback);
        clock.removeEventListener('seek', callback);
        clock.removeEventListener('ratechange', callback);
      };
    },
    [clock]
  );

  const getSnapshot = useCallback(() => clock.getState(), [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * useClockFrame - Get just the current frame (optimized)
 *
 * Use this when you only need the current frame number.
 * This is more efficient than useClockState() if you don't
 * need other state like isPlaying or playbackRate.
 */
export function useClockFrame(): number {
  const clock = useClock();

  const subscribe = useCallback(
    (callback: () => void) => {
      clock.addEventListener('framechange', callback);
      clock.addEventListener('seek', callback);

      return () => {
        clock.removeEventListener('framechange', callback);
        clock.removeEventListener('seek', callback);
      };
    },
    [clock]
  );

  const getSnapshot = useCallback(() => clock.currentFrame, [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * useClockIsPlaying - Get just the playing state (optimized)
 *
 * Use this when you only need to know if playback is active.
 */
export function useClockIsPlaying(): boolean {
  const clock = useClock();

  const subscribe = useCallback(
    (callback: () => void) => {
      clock.addEventListener('play', callback);
      clock.addEventListener('pause', callback);
      clock.addEventListener('ended', callback);

      return () => {
        clock.removeEventListener('play', callback);
        clock.removeEventListener('pause', callback);
        clock.removeEventListener('ended', callback);
      };
    },
    [clock]
  );

  const getSnapshot = useCallback(() => clock.isPlaying, [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * useClockPlaybackRate - Get just the playback rate (optimized)
 */
export function useClockPlaybackRate(): number {
  const clock = useClock();

  const subscribe = useCallback(
    (callback: () => void) => {
      clock.addEventListener('ratechange', callback);

      return () => {
        clock.removeEventListener('ratechange', callback);
      };
    },
    [clock]
  );

  const getSnapshot = useCallback(() => clock.playbackRate, [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * useClockTime - Get the current time in seconds
 */
export function useClockTime(): number {
  const clock = useClock();

  const subscribe = useCallback(
    (callback: () => void) => {
      clock.addEventListener('framechange', callback);
      clock.addEventListener('seek', callback);

      return () => {
        clock.removeEventListener('framechange', callback);
        clock.removeEventListener('seek', callback);
      };
    },
    [clock]
  );

  const getSnapshot = useCallback(() => clock.currentTime, [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * useClockCallback - Subscribe to clock events with a callback
 *
 * Use this for side effects that should run on clock events
 * without triggering re-renders.
 *
 * @param event - The event type to listen for
 * @param callback - The callback to run when the event fires
 */
export function useClockCallback(
  event: 'framechange' | 'play' | 'pause' | 'seek' | 'ended' | 'timeupdate' | 'ratechange',
  callback: (event: ClockEvent) => void
): void {
  const clock = useClock();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const handler = (e: ClockEvent) => {
      callbackRef.current(e);
    };

    clock.addEventListener(event, handler);
    return () => {
      clock.removeEventListener(event, handler);
    };
  }, [clock, event]);
}

/**
 * useClockControls - Get stable callback references for clock controls
 *
 * Returns memoized callbacks for play/pause/seek that won't change
 * between renders. Useful for passing to child components without
 * causing unnecessary re-renders.
 */
export function useClockControls() {
  const clock = useClock();

  const play = useCallback(() => clock.play(), [clock]);
  const pause = useCallback(() => clock.pause(), [clock]);
  const toggle = useCallback(() => clock.toggle(), [clock]);
  const seekToFrame = useCallback((frame: number) => clock.seekToFrame(frame), [clock]);
  const seekToTime = useCallback((time: number) => clock.seekToTime(time), [clock]);
  const stepForward = useCallback((frames?: number) => clock.stepForward(frames), [clock]);
  const stepBackward = useCallback((frames?: number) => clock.stepBackward(frames), [clock]);
  const goToStart = useCallback(() => clock.goToStart(), [clock]);
  const goToEnd = useCallback(() => clock.goToEnd(), [clock]);
  const setPlaybackRate = useCallback(
    (rate: number) => {
      clock.playbackRate = rate;
    },
    [clock]
  );

  return useMemo(
    () => ({
      play,
      pause,
      toggle,
      seekToFrame,
      seekToTime,
      stepForward,
      stepBackward,
      goToStart,
      goToEnd,
      setPlaybackRate,
    }),
    [
      play,
      pause,
      toggle,
      seekToFrame,
      seekToTime,
      stepForward,
      stepBackward,
      goToStart,
      goToEnd,
      setPlaybackRate,
    ]
  );
}
