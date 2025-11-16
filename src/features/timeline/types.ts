import type { TimelineTrack, TimelineItem } from '@/types/timeline';

export interface TimelineState {
  tracks: TimelineTrack[];
  items: TimelineItem[];
  currentFrame: number;
  isPlaying: boolean;
  fps: number;
  scrollPosition: number;
  snapEnabled: boolean;
}

export interface TimelineActions {
  setTracks: (tracks: TimelineTrack[]) => void;
  addItem: (item: TimelineItem) => void;
  updateItem: (id: string, updates: Partial<TimelineItem>) => void;
  removeItems: (ids: string[]) => void;
  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  toggleSnap: () => void;
}
