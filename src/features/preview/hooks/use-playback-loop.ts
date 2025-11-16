import { useEffect } from 'react';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';

interface UsePlaybackLoopOptions {
  totalFrames: number;
  fps: number;
}

/**
 * Custom hook for managing video playback loop
 *
 * Automatically advances frames when playing and loops back to start
 * when reaching the end of the timeline.
 *
 * @param totalFrames - Total number of frames in the timeline
 * @param fps - Frames per second for playback speed
 */
export function usePlaybackLoop({ totalFrames, fps }: UsePlaybackLoopOptions) {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const current = usePlaybackStore.getState().currentFrame;
      if (current >= totalFrames) {
        setCurrentFrame(0); // Loop back to start
      } else {
        setCurrentFrame(current + 1);
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, fps, totalFrames, setCurrentFrame]);
}
