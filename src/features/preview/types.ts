export interface PlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  loop: boolean;
  volume: number;
  muted: boolean;
  zoom: number;
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
}
