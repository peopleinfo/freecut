import { usePlaybackStore } from '@/features/preview/stores/playback-store';

interface TimecodeDisplayProps {
  fps: number;
  totalDuration: number; // in seconds
}

/**
 * Timecode Display Component
 *
 * Displays current time and total duration in MM:SS format
 * - Synchronized with playback store
 * - Tabular numbers for consistent width
 * - Primary color for current time
 */
export function TimecodeDisplay({ fps, totalDuration }: TimecodeDisplayProps) {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);

  // Convert frame to time (seconds)
  const currentSeconds = currentFrame / fps;
  const currentMinutes = Math.floor(currentSeconds / 60);
  const currentSecs = Math.floor(currentSeconds % 60);

  const totalMinutes = Math.floor(totalDuration / 60);
  const totalSecs = Math.floor(totalDuration % 60);

  return (
    <div className="px-4 py-2.5 bg-secondary/50 rounded-md border border-border">
      <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
        <span className="text-primary font-semibold">
          {String(currentMinutes).padStart(2, '0')}:
          {String(currentSecs).padStart(2, '0')}
        </span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground">
          {String(totalMinutes).padStart(2, '0')}:
          {String(totalSecs).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
