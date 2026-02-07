/**
 * Video frame extractor using mediabunny for precise frame access.
 *
 * This replaces HTML5 video element seeking which is slow and imprecise.
 * Benefits:
 * - Precise frame-by-frame access (no seek delays)
 * - Pre-decoded frames for instant access
 * - No 500ms timeout fallbacks needed
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('VideoFrameExtractor');

/** Types for dynamically imported mediabunny module */
interface MediabunnySink {
  getSample(timestamp: number): Promise<MediabunnySample | null>;
}

interface MediabunnySample {
  data: ArrayBuffer;
  toVideoFrame(): VideoFrame | null;
  close(): void;
}

interface MediabunnyInput {
  getPrimaryVideoTrack(): Promise<MediabunnyVideoTrack | null>;
  computeDuration(): Promise<number>;
  close(): void;
}

interface MediabunnyVideoTrack {
  duration: number;
  displayWidth: number;
  displayHeight: number;
}

export class VideoFrameExtractor {
  private sink: MediabunnySink | null = null;
  private input: MediabunnyInput | null = null;
  private videoTrack: MediabunnyVideoTrack | null = null;
  private duration: number = 0;
  private ready: boolean = false;

  constructor(
    private src: string,
    private itemId: string
  ) {}

  /**
   * Initialize the extractor - must be called before drawFrame()
   */
  async init(): Promise<boolean> {
    try {
      const mb = await import('mediabunny');

      // Fetch the video data from blob URL
      const response = await fetch(this.src);
      const blob = await response.blob();

      // Create input from blob
      this.input = new mb.Input({
        formats: mb.ALL_FORMATS,
        source: new mb.BlobSource(blob),
      });

      // Get video track
      this.videoTrack = await this.input.getPrimaryVideoTrack();
      if (!this.videoTrack) {
        log.warn('No video track found', { itemId: this.itemId });
        return false;
      }

      // Get duration
      this.duration = await this.input.computeDuration();

      // Create video sample sink for frame extraction
      this.sink = new mb.VideoSampleSink(this.videoTrack);

      this.ready = true;
      log.debug('Initialized', {
        itemId: this.itemId,
        duration: this.duration,
        width: this.videoTrack.displayWidth,
        height: this.videoTrack.displayHeight,
      });

      return true;
    } catch (error) {
      log.error('Failed to initialize', { itemId: this.itemId, error });
      return false;
    }
  }

  /**
   * Draw a frame at the specified timestamp directly to canvas.
   * Properly manages VideoSample lifecycle by closing immediately after draw.
   */
  async drawFrame(
    ctx: OffscreenCanvasRenderingContext2D,
    timestamp: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<boolean> {
    if (!this.ready || !this.sink) {
      return false;
    }

    let sample: MediabunnySample | null = null;
    let videoFrame: VideoFrame | null = null;
    try {
      // Clamp timestamp to valid range
      const clampedTime = Math.max(0, Math.min(timestamp, this.duration - 0.01));

      // Get the video sample at this timestamp
      sample = await this.sink.getSample(clampedTime);
      if (!sample) {
        return false;
      }

      // Get the underlying VideoFrame (native WebCodecs type)
      videoFrame = sample.toVideoFrame();
      if (!videoFrame) {
        return false;
      }

      // Draw to canvas - VideoFrame is a valid image source
      ctx.drawImage(videoFrame, x, y, width, height);

      return true;
    } catch (error) {
      log.error('Failed to draw frame', { itemId: this.itemId, timestamp, error });
      return false;
    } finally {
      // Close VideoFrame first (it's a copy, needs separate cleanup)
      if (videoFrame) {
        try {
          videoFrame.close();
        } catch {
          // Ignore close errors
        }
      }
      // Then close the sample
      if (sample) {
        try {
          sample.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Get video dimensions
   */
  getDimensions(): { width: number; height: number } {
    if (!this.videoTrack) {
      return { width: 1920, height: 1080 };
    }
    return {
      width: this.videoTrack.displayWidth,
      height: this.videoTrack.displayHeight,
    };
  }

  /**
   * Get video duration in seconds
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.sink = null;
    this.input = null;
    this.videoTrack = null;
    this.ready = false;
  }
}
