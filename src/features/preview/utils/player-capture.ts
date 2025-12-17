/**
 * Player frame capture utilities
 *
 * Captures the current rendered frame from the Remotion Player
 * for use as project thumbnails.
 *
 * Directly captures video elements using canvas.drawImage() which
 * can read the current video frame. This captures all videos at their
 * current positions in the composition.
 */

import type { PlayerRef } from '@remotion/player';

export interface CaptureOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** If true, capture at container size without scaling (for split transition overlays) */
  fullResolution?: boolean;
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  width: 320,
  height: 180,
  quality: 0.85,
  format: 'image/jpeg',
  fullResolution: false,
};

/**
 * Capture the current frame from a Remotion Player as a data URL
 *
 * @param playerRef - Ref to the Remotion Player instance
 * @param options - Capture size and format options
 * @returns Data URL of the captured frame, or null if capture failed
 */
export async function capturePlayerFrame(
  playerRef: React.RefObject<PlayerRef | null>,
  options: CaptureOptions = {}
): Promise<string | null> {
  if (!playerRef.current) {
    console.warn('[PlayerCapture] No player ref available');
    return null;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Get the Player's container DOM node
    const container = playerRef.current.getContainerNode();
    if (!container) {
      console.warn('[PlayerCapture] Could not get container node');
      return null;
    }

    const containerRect = container.getBoundingClientRect();

    // Create output canvas at container size first, then scale down
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = containerRect.width;
    captureCanvas.height = containerRect.height;
    const ctx = captureCanvas.getContext('2d');

    if (!ctx) {
      console.warn('[PlayerCapture] Could not get 2d context');
      return null;
    }

    // Fill with black background (or could use project background color)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);

    // Find all video elements and draw them first (background layer)
    const videos = container.querySelectorAll('video');

    for (const video of videos) {
      if (video.readyState >= 2) {
        try {
          // Get video's position relative to container
          const videoRect = video.getBoundingClientRect();
          const x = videoRect.left - containerRect.left;
          const y = videoRect.top - containerRect.top;

          // Draw video at its actual position and size
          ctx.drawImage(video, x, y, videoRect.width, videoRect.height);
        } catch (e) {
          console.warn('[PlayerCapture] Failed to draw video:', e);
        }
      }
    }

    // Note: We skip html2canvas for overlays because hiding videos causes a flash.
    // For now, thumbnails show video content only. Text/shapes won't appear in thumbnails.

    // If fullResolution is requested, return capture canvas directly without scaling
    if (opts.fullResolution) {
      const dataUrl = captureCanvas.toDataURL(opts.format, opts.quality);
      return dataUrl;
    }

    // Resize to thumbnail dimensions
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = opts.width;
    outputCanvas.height = opts.height;

    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) {
      console.warn('[PlayerCapture] Could not get output 2d context');
      return null;
    }

    outputCtx.drawImage(captureCanvas, 0, 0, opts.width, opts.height);

    return outputCanvas.toDataURL(opts.format, opts.quality);
  } catch (error) {
    console.error('[PlayerCapture] Failed to capture frame:', error);
    return null;
  }
}
