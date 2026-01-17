/**
 * types.ts - Audio-related types for the custom player
 *
 * Defines interfaces for audio elements, tracks, and playback state.
 */

/**
 * Audio item from the timeline
 */
export interface AudioItemData {
  id: string;
  src: string;
  /** Start frame on the timeline */
  from: number;
  /** Duration in frames on the timeline */
  durationInFrames: number;
  /** Start position in source audio (in frames, relative to source) */
  sourceStart?: number;
  /** End position in source audio (in frames) */
  sourceEnd?: number;
  /** Source audio duration (in frames) */
  sourceDuration?: number;
  /** Playback speed multiplier */
  speed?: number;
  /** Volume in dB (0 = unity) */
  volume?: number;
  /** Audio fade in duration in seconds */
  audioFadeIn?: number;
  /** Audio fade out duration in seconds */
  audioFadeOut?: number;
  /** Whether the track is muted */
  muted?: boolean;
  /** Track order for mixing */
  trackOrder?: number;
  /** Whether the track is visible/audible */
  trackVisible?: boolean;
  /** Crossfade fade in duration in FRAMES (for transitions) */
  crossfadeFadeIn?: number;
  /** Crossfade fade out duration in FRAMES (for transitions) */
  crossfadeFadeOut?: number;
}

/**
 * Audio element state
 */
export interface AudioElementState {
  /** Whether the audio is loaded and ready to play */
  ready: boolean;
  /** Whether the audio is currently loading */
  loading: boolean;
  /** Whether there was an error loading the audio */
  error: Error | null;
  /** Whether the audio is currently buffering */
  buffering: boolean;
  /** Current time in seconds */
  currentTime: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Web Audio API node references
 */
export interface AudioNodes {
  /** The AudioContext for this audio */
  context: AudioContext;
  /** Source node connected to the audio element */
  source: MediaElementAudioSourceNode;
  /** Gain node for volume control (allows > 1 for boost) */
  gain: GainNode;
  /** Optional: Analyser node for visualizations */
  analyser?: AnalyserNode;
}

/**
 * Props for AudioElement component
 */
export interface AudioElementProps {
  /** Audio source URL */
  src: string;
  /** Unique identifier */
  id: string;
  /** Start time in the source audio (seconds) */
  startTime?: number;
  /** Current playback time within the item (seconds) */
  currentTime: number;
  /** Whether the audio should be playing */
  isPlaying: boolean;
  /** Playback rate (1 = normal speed) */
  playbackRate?: number;
  /** Volume in dB (0 = unity, can be positive for boost) */
  volumeDb?: number;
  /** Whether audio is muted */
  muted?: boolean;
  /** Fade in duration in seconds */
  fadeIn?: number;
  /** Fade out duration in seconds */
  fadeOut?: number;
  /** Total duration of this audio item in seconds */
  duration: number;
  /** Whether to preserve pitch when changing playback rate */
  preservePitch?: boolean;
  /** Called when audio is ready to play */
  onReady?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when buffering state changes */
  onBuffering?: (isBuffering: boolean) => void;
  /** Called on each time update */
  onTimeUpdate?: (currentTime: number) => void;
}

/**
 * Props for AudioTrackManager component
 */
export interface AudioTrackManagerProps {
  /** All audio items in the timeline */
  items: AudioItemData[];
  /** Current frame position */
  currentFrame: number;
  /** Timeline FPS */
  fps: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback rate */
  playbackRate?: number;
  /** Master volume (0-1, applied to all audio) */
  masterVolume?: number;
  /** Whether master is muted */
  masterMuted?: boolean;
  /** Number of frames to preload ahead */
  preloadAheadFrames?: number;
  /** Number of frames to keep loaded behind */
  preloadBehindFrames?: number;
  /** Called when an audio encounters an error */
  onAudioError?: (itemId: string, error: Error) => void;
}

/**
 * Audio track state
 */
export interface AudioTrackState {
  /** Map of audio ID to loading state */
  loadingStates: Map<string, boolean>;
  /** Map of audio ID to error state */
  errorStates: Map<string, Error | null>;
  /** Map of audio ID to ready state */
  readyStates: Map<string, boolean>;
  /** Currently active audio IDs (within their time range) */
  activeIds: Set<string>;
  /** Preloaded audio IDs */
  preloadedIds: Set<string>;
}

/**
 * Fade configuration for audio
 */
export interface AudioFadeConfig {
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
  /** Total duration for fade calculations */
  duration: number;
  /** Whether to use equal-power (crossfade) curve */
  useEqualPower?: boolean;
}

/**
 * Calculate fade multiplier at a given time
 */
export type CalculateFadeMultiplier = (
  currentTime: number,
  config: AudioFadeConfig
) => number;

/**
 * Convert dB to linear volume
 * 0 dB = 1.0, +20 dB = 10.0, -20 dB = 0.1
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear volume to dB
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Calculate linear fade multiplier (0 to 1)
 */
export function calculateLinearFade(
  currentTime: number,
  config: AudioFadeConfig
): number {
  const { fadeIn, fadeOut, duration } = config;

  // No fades
  if (fadeIn <= 0 && fadeOut <= 0) {
    return 1;
  }

  const fadeOutStart = duration - fadeOut;

  // Handle overlapping fades
  if (fadeIn > 0 && fadeOut > 0 && fadeIn >= fadeOutStart) {
    const midPoint = duration / 2;
    const peakVolume = Math.min(1, midPoint / Math.max(fadeIn, 0.001));

    if (currentTime <= midPoint) {
      return (currentTime / midPoint) * peakVolume;
    } else {
      return ((duration - currentTime) / (duration - midPoint)) * peakVolume;
    }
  }

  // Fade in region
  if (fadeIn > 0 && currentTime < fadeIn) {
    return currentTime / fadeIn;
  }

  // Fade out region
  if (fadeOut > 0 && currentTime >= fadeOutStart) {
    return (duration - currentTime) / fadeOut;
  }

  // Full volume
  return 1;
}

/**
 * Calculate equal-power (crossfade) multiplier
 * Uses sin/cos curves for constant perceived loudness
 */
export function calculateEqualPowerFade(
  currentTime: number,
  config: AudioFadeConfig
): number {
  const { fadeIn, fadeOut, duration } = config;

  // No fades
  if (fadeIn <= 0 && fadeOut <= 0) {
    return 1;
  }

  const fadeOutStart = duration - fadeOut;

  // Fade in region: sin curve (0 to 1)
  if (fadeIn > 0 && currentTime < fadeIn) {
    const progress = currentTime / fadeIn;
    return Math.sin(progress * Math.PI / 2);
  }

  // Fade out region: cos curve (1 to 0)
  if (fadeOut > 0 && currentTime >= fadeOutStart) {
    const progress = (currentTime - fadeOutStart) / fadeOut;
    return Math.cos(progress * Math.PI / 2);
  }

  // Full volume
  return 1;
}
