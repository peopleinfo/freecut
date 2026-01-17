/**
 * use-video-frame.ts - Hook for requestVideoFrameCallback
 *
 * Provides frame-accurate video timing using the requestVideoFrameCallback API.
 * Falls back to timeupdate events for browsers that don't support it.
 *
 * requestVideoFrameCallback is supported in:
 * - Chrome 83+
 * - Edge 83+
 * - Safari 15.4+
 * - Firefox (behind flag, not yet default)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
 */

import { useEffect, useRef, useCallback } from 'react';
import type { VideoFrameCallback, VideoFrameMetadata } from './types';

/**
 * Check if requestVideoFrameCallback is supported
 */
export function isVideoFrameCallbackSupported(): boolean {
  if (typeof HTMLVideoElement === 'undefined') {
    return false;
  }
  return 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

/**
 * Type augmentation for HTMLVideoElement with requestVideoFrameCallback
 */
declare global {
  interface HTMLVideoElement {
    requestVideoFrameCallback(callback: VideoFrameCallback): number;
    cancelVideoFrameCallback(handle: number): void;
  }
}

/**
 * Options for useVideoFrame hook
 */
export interface UseVideoFrameOptions {
  /** Whether to enable frame callbacks */
  enabled?: boolean;
  /** Fallback to timeupdate if requestVideoFrameCallback is not supported */
  fallbackToTimeUpdate?: boolean;
  /** Callback when a frame is presented */
  onFrame?: VideoFrameCallback;
  /** FPS for converting mediaTime to frame number */
  fps?: number;
  /** Callback with just the frame number (convenience) */
  onFrameNumber?: (frame: number) => void;
}

/**
 * Hook to receive callbacks on each video frame
 *
 * Uses requestVideoFrameCallback for frame-accurate timing when available,
 * falls back to timeupdate events otherwise.
 *
 * @param videoRef - Ref to the video element
 * @param options - Configuration options
 * @returns Object with frame info and support status
 */
export function useVideoFrame(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseVideoFrameOptions = {}
) {
  const {
    enabled = true,
    fallbackToTimeUpdate = true,
    onFrame,
    onFrameNumber,
    fps = 30,
  } = options;

  // Track callback refs to avoid stale closures
  const onFrameRef = useRef(onFrame);
  const onFrameNumberRef = useRef(onFrameNumber);
  const fpsRef = useRef(fps);

  // Update refs when callbacks change
  useEffect(() => {
    onFrameRef.current = onFrame;
    onFrameNumberRef.current = onFrameNumber;
    fpsRef.current = fps;
  }, [onFrame, onFrameNumber, fps]);

  // Track whether we're using the native API
  const isSupported = isVideoFrameCallbackSupported();
  const usingNativeRef = useRef(isSupported);

  // Handle for cancellation
  const callbackHandleRef = useRef<number | null>(null);

  // Frame callback implementation
  const frameCallback = useCallback<VideoFrameCallback>((now, metadata) => {
    // Call the raw frame callback
    onFrameRef.current?.(now, metadata);

    // Calculate and call the frame number callback
    if (onFrameNumberRef.current && metadata.mediaTime !== undefined) {
      const frameNumber = Math.round(metadata.mediaTime * fpsRef.current);
      onFrameNumberRef.current(frameNumber);
    }
  }, []);

  // Request next frame (for continuous monitoring)
  const requestNextFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    if (isSupported) {
      callbackHandleRef.current = video.requestVideoFrameCallback((now, metadata) => {
        frameCallback(now, metadata as VideoFrameMetadata);
        // Continue requesting frames while playing
        if (!video.paused && !video.ended) {
          requestNextFrame();
        }
      });
    }
  }, [videoRef, enabled, frameCallback, isSupported]);

  // Set up frame callbacks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    // Clean up any existing callback
    if (callbackHandleRef.current !== null && isSupported) {
      video.cancelVideoFrameCallback(callbackHandleRef.current);
      callbackHandleRef.current = null;
    }

    if (isSupported) {
      usingNativeRef.current = true;

      // Start frame callback loop
      const startCallbackLoop = () => {
        requestNextFrame();
      };

      // Restart callback loop when playback starts
      video.addEventListener('play', startCallbackLoop);
      video.addEventListener('seeked', startCallbackLoop);

      // Initial request if already playing
      if (!video.paused) {
        startCallbackLoop();
      }

      return () => {
        video.removeEventListener('play', startCallbackLoop);
        video.removeEventListener('seeked', startCallbackLoop);
        if (callbackHandleRef.current !== null) {
          video.cancelVideoFrameCallback(callbackHandleRef.current);
          callbackHandleRef.current = null;
        }
      };
    } else if (fallbackToTimeUpdate) {
      usingNativeRef.current = false;

      // Fallback to timeupdate events
      const handleTimeUpdate = () => {
        const currentTime = performance.now();

        // Create a synthetic metadata object
        const metadata: VideoFrameMetadata = {
          presentationTime: currentTime,
          expectedDisplayTime: currentTime,
          width: video.videoWidth,
          height: video.videoHeight,
          mediaTime: video.currentTime,
          presentedFrames: Math.round(video.currentTime * fpsRef.current),
        };

        frameCallback(currentTime, metadata);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [videoRef, enabled, fallbackToTimeUpdate, frameCallback, requestNextFrame, isSupported]);

  return {
    /** Whether requestVideoFrameCallback is supported */
    isSupported,
    /** Whether we're using the native API or fallback */
    usingNative: usingNativeRef.current,
  };
}

/**
 * Hook to get the current video frame number
 *
 * Simpler hook that just returns the current frame number,
 * updated on each video frame.
 *
 * @param videoRef - Ref to the video element
 * @param fps - Frames per second
 * @returns Current frame number
 */
export function useCurrentVideoFrame(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  fps: number = 30
): number {
  const frameRef = useRef(0);

  useVideoFrame(videoRef, {
    fps,
    onFrameNumber: (frame) => {
      frameRef.current = frame;
    },
  });

  return frameRef.current;
}

/**
 * Hook to sync video playback with a target time
 *
 * Monitors the video's current time and calls a callback when
 * drift exceeds a threshold, allowing for correction.
 *
 * @param videoRef - Ref to the video element
 * @param targetTime - Target time in seconds
 * @param options - Sync options
 */
export function useVideoTimeSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  targetTime: number,
  options: {
    /** Maximum allowed drift in seconds before correction */
    maxDrift?: number;
    /** Callback when correction is needed */
    onDrift?: (currentTime: number, targetTime: number, drift: number) => void;
    /** Whether sync is enabled */
    enabled?: boolean;
  } = {}
) {
  const { maxDrift = 0.05, onDrift, enabled = true } = options;
  const onDriftRef = useRef(onDrift);

  useEffect(() => {
    onDriftRef.current = onDrift;
  }, [onDrift]);

  useVideoFrame(videoRef, {
    enabled,
    onFrame: (_now, metadata) => {
      const currentTime = metadata.mediaTime;
      const drift = Math.abs(currentTime - targetTime);

      if (drift > maxDrift) {
        onDriftRef.current?.(currentTime, targetTime, drift);
      }
    },
  });
}

/**
 * Utility: Request a single video frame callback
 *
 * Useful for one-off frame captures or seeking verification.
 *
 * @param video - Video element
 * @returns Promise that resolves with frame metadata
 */
export function requestSingleFrame(
  video: HTMLVideoElement
): Promise<VideoFrameMetadata> {
  return new Promise((resolve, reject) => {
    if (!isVideoFrameCallbackSupported()) {
      // Fallback: resolve immediately with current state
      const now = performance.now();
      const fallbackMetadata: VideoFrameMetadata = {
        presentationTime: now,
        expectedDisplayTime: now,
        width: video.videoWidth,
        height: video.videoHeight,
        mediaTime: video.currentTime,
        presentedFrames: 0,
      };
      resolve(fallbackMetadata);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('requestVideoFrameCallback timed out'));
    }, 5000);

    video.requestVideoFrameCallback((_now, metadata) => {
      clearTimeout(timeoutId);
      resolve(metadata as VideoFrameMetadata);
    });
  });
}

/**
 * Utility: Wait for video to seek to a specific time
 *
 * Combines seeking with frame callback verification for
 * frame-accurate positioning.
 *
 * @param video - Video element
 * @param targetTime - Target time in seconds
 * @param tolerance - Acceptable difference from target (default 0.01s)
 * @returns Promise that resolves when seek is complete
 */
export async function seekToTimeAccurate(
  video: HTMLVideoElement,
  targetTime: number,
  tolerance: number = 0.01
): Promise<VideoFrameMetadata> {
  // Set the video's current time
  video.currentTime = targetTime;

  // Wait for seeked event
  await new Promise<void>((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler);
      resolve();
    };
    video.addEventListener('seeked', handler);
  });

  // Verify with frame callback if supported
  if (isVideoFrameCallbackSupported()) {
    const metadata = await requestSingleFrame(video);

    // Check if we're within tolerance
    const drift = Math.abs(metadata.mediaTime - targetTime);
    if (drift > tolerance) {
      // Try one more time with adjusted target
      const adjustment = targetTime - metadata.mediaTime;
      video.currentTime = targetTime + adjustment;

      await new Promise<void>((resolve) => {
        const handler = () => {
          video.removeEventListener('seeked', handler);
          resolve();
        };
        video.addEventListener('seeked', handler);
      });

      return requestSingleFrame(video);
    }

    return metadata;
  }

  // Return synthetic metadata if not supported
  const now = performance.now();
  const fallbackMetadata: VideoFrameMetadata = {
    presentationTime: now,
    expectedDisplayTime: now,
    width: video.videoWidth,
    height: video.videoHeight,
    mediaTime: video.currentTime,
    presentedFrames: Math.round(video.currentTime * 30),
  };
  return fallbackMetadata;
}
