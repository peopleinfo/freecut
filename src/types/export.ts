export interface ExportSettings {
  codec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: { width: number; height: number };
  fps: number;
  bitrate?: string;
  audioBitrate?: string;
}

import type { TimelineTrack } from './timeline';

export interface RemotionInputProps {
  fps: number;
  tracks: TimelineTrack[];
}
