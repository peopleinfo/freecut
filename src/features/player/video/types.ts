/**
 * types.ts - Video-related types for the custom player
 *
 * Defines interfaces for video elements, tracks, and playback state.
 */

/**
 * Video item from the timeline
 */
export interface VideoItemData {
  id: string;
  src: string;
  /** Start frame on the timeline */
  from: number;
  /** Duration in frames on the timeline */
  durationInFrames: number;
  /** Start position in source video (in seconds) */
  sourceStart?: number;
  /** End position in source video (in seconds) */
  sourceEnd?: number;
  /** Source video duration (in seconds) */
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
  /** Z-index for layering */
  zIndex?: number;
  /** Track order for effect application */
  trackOrder?: number;
  /** Whether the track is visible */
  trackVisible?: boolean;
}

/**
 * Video element state
 */
export interface VideoElementState {
  /** Whether the video is loaded and ready to play */
  ready: boolean;
  /** Whether the video is currently loading */
  loading: boolean;
  /** Whether there was an error loading the video */
  error: Error | null;
  /** Whether the video is currently buffering */
  buffering: boolean;
  /** Current time in seconds */
  currentTime: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Video seek options
 */
export interface VideoSeekOptions {
  /** Target time in seconds */
  time: number;
  /** Whether to use fast seeking (less accurate) */
  fast?: boolean;
}

/**
 * Video frame callback metadata
 * Based on VideoFrameCallbackMetadata from requestVideoFrameCallback
 */
export interface VideoFrameMetadata {
  /** The time at which the user agent submitted the frame for composition */
  presentationTime: DOMHighResTimeStamp;
  /** The time at which the user agent expects the frame to be visible */
  expectedDisplayTime: DOMHighResTimeStamp;
  /** The width of the video frame, in media pixels */
  width: number;
  /** The height of the video frame, in media pixels */
  height: number;
  /** The media presentation timestamp (PTS) in seconds */
  mediaTime: number;
  /** The elapsed time in seconds since playback started */
  presentedFrames: number;
  /** The time at which the frame was processed */
  processingDuration?: number;
  /** The time spent waiting for the video to be ready */
  captureTime?: DOMHighResTimeStamp;
  /** RTP timestamp */
  receiveTime?: DOMHighResTimeStamp;
  /** Frame number */
  rtpTimestamp?: number;
}

/**
 * Video frame callback function type
 */
export type VideoFrameCallback = (
  now: DOMHighResTimeStamp,
  metadata: VideoFrameMetadata
) => void;

/**
 * Props for VideoElement component
 */
export interface VideoElementProps {
  /** Video source URL */
  src: string;
  /** Unique identifier */
  id: string;
  /** Start time in the source video (seconds) */
  startTime?: number;
  /** Whether the video should be playing */
  isPlaying: boolean;
  /** Current playback time (seconds) */
  currentTime: number;
  /** Playback rate */
  playbackRate?: number;
  /** Volume (0-1 for normal, can exceed 1 for boost) */
  volume?: number;
  /** Whether audio is muted */
  muted?: boolean;
  /** Whether the video is visible */
  visible?: boolean;
  /** Called when video is ready to play */
  onReady?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called on each video frame (if requestVideoFrameCallback is supported) */
  onFrame?: VideoFrameCallback;
  /** Called when buffering state changes */
  onBuffering?: (isBuffering: boolean) => void;
  /** CSS class name */
  className?: string;
  /** CSS styles */
  style?: React.CSSProperties;
}

/**
 * Props for VideoTrackManager component
 */
export interface VideoTrackManagerProps {
  /** All video items in the timeline */
  items: VideoItemData[];
  /** Current frame position */
  currentFrame: number;
  /** Timeline FPS */
  fps: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback rate */
  playbackRate?: number;
  /** Number of frames to preload ahead */
  preloadAheadFrames?: number;
  /** Number of frames to keep loaded behind */
  preloadBehindFrames?: number;
  /** Render function for each video item */
  renderItem?: (item: VideoItemData, videoElement: React.ReactNode) => React.ReactNode;
  /** Called when a video encounters an error */
  onVideoError?: (itemId: string, error: Error) => void;
}

/**
 * Video track state
 */
export interface VideoTrackState {
  /** Map of video ID to loading state */
  loadingStates: Map<string, boolean>;
  /** Map of video ID to error state */
  errorStates: Map<string, Error | null>;
  /** Map of video ID to ready state */
  readyStates: Map<string, boolean>;
  /** Currently visible video IDs */
  visibleIds: Set<string>;
  /** Preloaded video IDs */
  preloadedIds: Set<string>;
}

/**
 * Pooled video element
 */
export interface PooledVideoElement {
  /** The HTML video element */
  element: HTMLVideoElement;
  /** Current source URL */
  src: string | null;
  /** Whether the element is currently in use */
  inUse: boolean;
  /** Item ID using this element */
  itemId: string | null;
  /** Last used timestamp for LRU eviction */
  lastUsed: number;
}

/**
 * Video pool configuration
 */
export interface VideoPoolConfig {
  /** Maximum number of video elements to keep in the pool */
  maxSize?: number;
  /** Whether to preload videos */
  preload?: boolean;
  /** Preload attribute value */
  preloadValue?: 'none' | 'metadata' | 'auto';
}

/**
 * Utility function types
 */

/**
 * Convert frame number to time in seconds
 */
export type FrameToTime = (frame: number, fps: number) => number;

/**
 * Convert time in seconds to frame number
 */
export type TimeToFrame = (time: number, fps: number) => number;

/**
 * Check if a video item is visible at a given frame
 */
export type IsItemVisible = (item: VideoItemData, frame: number) => boolean;

/**
 * Calculate the local time within a video item
 */
export type GetLocalTime = (
  item: VideoItemData,
  globalFrame: number,
  fps: number
) => number;
