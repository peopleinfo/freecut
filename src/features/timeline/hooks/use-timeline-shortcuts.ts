import { useEffect } from 'react';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { useTimelineStore } from '../stores/timeline-store';

export interface TimelineShortcutCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onSplit?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

/**
 * Timeline keyboard shortcuts hook
 *
 * Handles all timeline-specific keyboard shortcuts:
 * - Space: Play/Pause
 * - Arrow Left/Right: Previous/Next frame
 * - Home/End: Go to start/end
 * - Delete/Backspace: Delete selected clips
 * - C: Split clip at playhead
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 */
export function useTimelineShortcuts(callbacks: TimelineShortcutCallbacks = {}) {
  // Access stores
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const selectedItemIds = useTimelineStore((s) => s.selectedItemIds);
  const removeClips = useTimelineStore((s) => s.removeClips);
  const fps = useTimelineStore((s) => s.fps);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      switch (event.key) {
        case ' ': // Space - Play/Pause
          event.preventDefault();
          togglePlayPause();
          if (isPlaying && callbacks.onPause) {
            callbacks.onPause();
          } else if (!isPlaying && callbacks.onPlay) {
            callbacks.onPlay();
          }
          break;

        case 'ArrowLeft': // Previous frame
          event.preventDefault();
          setCurrentFrame(Math.max(0, currentFrame - 1));
          break;

        case 'ArrowRight': // Next frame
          event.preventDefault();
          setCurrentFrame(currentFrame + 1);
          break;

        case 'Home': // Go to start
          event.preventDefault();
          setCurrentFrame(0);
          break;

        case 'End': // Go to end (placeholder - would need total duration)
          event.preventDefault();
          // TODO: Calculate total timeline duration
          setCurrentFrame(900); // Placeholder
          break;

        case 'Delete':
        case 'Backspace':
          // Delete selected clips
          if (selectedItemIds.length > 0) {
            event.preventDefault();
            removeClips(selectedItemIds);
            if (callbacks.onDelete) {
              callbacks.onDelete();
            }
          }
          break;

        case 'c':
        case 'C':
          // Split clip at playhead
          if (!modifier) {
            event.preventDefault();
            if (callbacks.onSplit) {
              callbacks.onSplit();
            }
          }
          break;

        case 'z':
        case 'Z':
          // Undo/Redo
          if (modifier) {
            event.preventDefault();
            if (event.shiftKey) {
              // Redo
              useTimelineStore.temporal.getState().redo();
              if (callbacks.onRedo) {
                callbacks.onRedo();
              }
            } else {
              // Undo
              useTimelineStore.temporal.getState().undo();
              if (callbacks.onUndo) {
                callbacks.onUndo();
              }
            }
          }
          break;

        case 'k':
        case 'K':
          // K - Play/Pause (alternative, common in video editors)
          event.preventDefault();
          togglePlayPause();
          break;

        case 'j':
        case 'J':
          // J - Previous frame (alternative)
          event.preventDefault();
          setCurrentFrame(Math.max(0, currentFrame - 1));
          break;

        case 'l':
        case 'L':
          // L - Next frame (alternative)
          event.preventDefault();
          setCurrentFrame(currentFrame + 1);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    togglePlayPause,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    selectedItemIds,
    removeClips,
    fps,
    callbacks,
  ]);
}
