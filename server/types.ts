import type { ExportSettings } from '../src/types/export.js';
import type { TimelineTrack } from '../src/types/timeline.js';
import type { Transition } from '../src/types/transition.js';
import type { ItemKeyframes } from '../src/types/keyframe.js';

export interface RenderRequest {
  jobId: string;
  composition: {
    fps: number;
    durationInFrames: number;
    width: number;
    height: number;
    tracks: TimelineTrack[];
    transitions?: Transition[];
    keyframes?: ItemKeyframes[];
  };
  settings: ExportSettings;
  mediaFiles: string[]; // List of media IDs that need to be uploaded
}

export interface RenderJob {
  jobId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  renderedFrames?: number;
  totalFrames?: number;
  error?: string;
  outputPath?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RenderProgress {
  jobId: string;
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  status: RenderJob['status'];
}

export interface MediaUpload {
  mediaId: string;
  file: Buffer;
  filename: string;
  mimetype: string;
}
