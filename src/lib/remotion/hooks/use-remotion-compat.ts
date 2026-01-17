import { useVideoConfig as useRemotionVideoConfig, useCurrentFrame as useRemotionCurrentFrame, getRemotionEnvironment, Internals } from 'remotion';
import { useVideoConfig as useCustomVideoConfig } from '@/features/player/video-config-context';
import { useBridgedCurrentFrame, useBridgedIsPlaying } from '@/features/player/clock';

/**
 * Get video config from custom player context, falling back to Remotion's hook.
 */
export function useVideoConfig() {
  try {
    return useCustomVideoConfig();
  } catch {
    return useRemotionVideoConfig();
  }
}

/**
 * Get current frame from custom player context, falling back to Remotion's hook.
 */
export function useCurrentFrame() {
  try {
    return useBridgedCurrentFrame();
  } catch {
    return useRemotionCurrentFrame();
  }
}

/**
 * Check if we're in Remotion rendering mode (export) vs preview mode.
 * Returns true during export, false during preview.
 */
export function useIsRendering(): boolean {
  try {
    // Try to detect if we're in a ClockProvider (preview mode)
    useBridgedCurrentFrame();
    // If we get here, we're in preview mode
    return false;
  } catch {
    // Not in ClockProvider, check Remotion environment
    try {
      const env = getRemotionEnvironment();
      return env.isRendering;
    } catch {
      // Default to preview mode if we can't determine
      return false;
    }
  }
}

/**
 * Get playing state from custom player context, falling back to Remotion's internal hook.
 * Returns true if currently playing (or always true during render).
 */
export function useIsPlaying(): boolean {
  try {
    return useBridgedIsPlaying();
  } catch {
    // Fallback to Remotion's internal playing state
    try {
      const [playing] = Internals.Timeline.usePlayingState();
      return playing;
    } catch {
      // Default to not playing if we can't determine
      return false;
    }
  }
}
