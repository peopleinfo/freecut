/**
 * Clock System - Central timing for the video player
 *
 * The Clock system provides a unified timing source for all
 * player components. It's designed to be independent of React's
 * render cycle for optimal performance.
 *
 * Core components:
 * - Clock: The timing class itself (use createClock to instantiate)
 * - ClockProvider: React context provider
 * - useClock: Get the Clock instance for imperative control
 * - useClockState: Get reactive state that triggers re-renders
 *
 * Example usage:
 *
 * ```tsx
 * // In your app
 * <ClockProvider fps={30} durationInFrames={900}>
 *   <VideoPlayer />
 * </ClockProvider>
 *
 * // In a component that needs to control playback
 * function PlayButton() {
 *   const clock = useClock();
 *   return <button onClick={() => clock.toggle()}>Play/Pause</button>;
 * }
 *
 * // In a component that needs to display time
 * function TimeDisplay() {
 *   const { frame, time, isPlaying } = useClockState();
 *   return <span>{isPlaying ? 'Playing' : 'Paused'} - Frame {frame}</span>;
 * }
 *
 * // For performance-sensitive components that only need the frame
 * function FrameOnlyDisplay() {
 *   const frame = useClockFrame();
 *   return <span>Frame {frame}</span>;
 * }
 * ```
 */

// Core Clock class and types
export {
  Clock,
  createClock,
  type ClockConfig,
  type ClockEvent,
  type ClockEventType,
  type ClockEventCallback,
} from './Clock';

// React context and provider
export { ClockProvider } from './ClockContext';

// Core hooks from ClockContext
export {
  useClock,
  useClockState,
  useClockFrame,
  useClockIsPlaying,
  useClockPlaybackRate,
  useClockTime,
  useClockCallback,
  useClockControls,
} from './ClockContext';

// Utility hooks from use-clock
export {
  useFrameCallback,
  useThrottledFrame,
  useIsFrameInRange,
  useLocalFrame,
  usePlayPause,
  useSeek,
  useProgress,
  useAtBoundary,
  useClockConfig,
  useSyncWithExternalTime,
} from './use-clock';

// Bridge for backwards compatibility with existing player-context
export {
  ClockBridgeProvider,
  useBridgedTimelineContext,
  useBridgedSetTimelineContext,
  useBridgedCurrentFrame,
  useBridgedIsPlaying,
  useBridgedPlaybackRate,
  useBridgedSetTimelineFrame,
  useBridgedPlayingState,
  useBridgedActualFirstFrame,
  useBridgedActualLastFrame,
  useBridgedTimelinePosition,
  useBridgedIsFirstFrame,
  useBridgedIsLastFrame,
  useClockInstance,
  type TimelineContextValue,
  type SetTimelineContextValue,
} from './ClockBridge';
