/**
 * FreeCut Player - A customizable video player component
 *
 * A frame-accurate video player with support for:
 * - Frame-accurate playback via Clock system
 * - Multi-track video composition
 * - Custom composition primitives (Sequence, AbsoluteFill, interpolate)
 * - Custom controls
 * - Fullscreen mode
 * - Event emission
 *
 * Key modules:
 * - Clock: Central timing system
 * - Video: Multi-track video management
 * - Composition: Sequence, AbsoluteFill, interpolate
 */

// Core types and utilities
export * from './event-emitter';
export * from './player-context';
export * from './video-config-context';

// Clock system (timing)
// Note: Clock exports its own TimelineContextValue and SetTimelineContextValue
// which are compatible with player-context but may shadow them
export {
  // Clock core
  Clock,
  createClock,
  type ClockConfig,
  type ClockEvent,
  type ClockEventType,
  type ClockEventCallback,
  // Clock context and provider
  ClockProvider,
  ClockBridgeProvider,
  // Clock hooks
  useClock,
  useClockState,
  useClockFrame,
  useClockIsPlaying,
  useClockPlaybackRate,
  useClockTime,
  useClockCallback,
  useClockControls,
  // Clock utility hooks
  useFrameCallback,
  useThrottledFrame,
  useIsFrameInRange,
  usePlayPause,
  useSeek,
  useProgress,
  useAtBoundary,
  useClockConfig,
  useSyncWithExternalTime,
  // Bridged hooks (for backwards compatibility)
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
} from './clock';

// Video system (multi-track video)
export * from './video';

// Audio system (multi-track audio)
export * from './audio';

// Export system (WebCodecs-based)
export * from './export';

// Composition primitives (Sequence, AbsoluteFill, interpolate)
// Note: useLocalFrame from composition shadows clock's version
export {
  Sequence,
  useSequenceContext,
  useLocalFrame,
  useSequenceFrom,
  useIsInRange,
  useSequenceVisibility,
  type SequenceProps,
  AbsoluteFill,
  useAbsoluteFillStyle,
  type AbsoluteFillProps,
  interpolate,
  interpolateColors,
  Easing,
  clamp,
  mapRange,
  spring,
  type InterpolateOptions,
  type ExtrapolationType,
} from './composition';

// Player hooks
export { usePlayer, usePlayerRef } from './use-player';
export { usePlayback, calculateNextFrame } from './use-playback';

// Main component
export { Player, default } from './Player';
export type { PlayerProps, PlayerRef } from './Player';
