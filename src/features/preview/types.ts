export interface PlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  loop: boolean;
  volume: number;
  muted: boolean;
  zoom: number;
  /** Function to capture the current Player frame as a data URL (set by VideoPreview) */
  captureFrame: (() => Promise<string | null>) | null;
}

export interface PlaybackActions {
  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setZoom: (zoom: number) => void;
  /** Register a frame capture function (called by VideoPreview on mount) */
  setCaptureFrame: (fn: (() => Promise<string | null>) | null) => void;
}
