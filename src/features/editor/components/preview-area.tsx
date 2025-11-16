import { Separator } from '@/components/ui/separator';
import {
  VideoPreview,
  PlaybackControls,
  TimecodeDisplay,
} from '@/features/preview';

interface PreviewAreaProps {
  project: {
    width: number;
    height: number;
    fps: number;
  };
}

/**
 * Preview Area Component
 *
 * Modular composition of preview-related components:
 * - VideoPreview: Canvas with grid, rulers, frame counter
 * - PlaybackControls: Transport controls with React 19 patterns
 * - TimecodeDisplay: Current time display
 *
 * Uses granular Zustand selectors in child components
 */
export function PreviewArea({ project }: PreviewAreaProps) {
  // TODO: Get from timeline store
  const totalFrames = 900; // 30 seconds at 30fps
  const duration = totalFrames / project.fps;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Video Preview Canvas */}
      <VideoPreview project={project} />

      {/* Playback Controls */}
      <div className="h-16 border-t border-border panel-header flex items-center justify-center gap-6 px-6 flex-shrink-0">
        <PlaybackControls totalFrames={totalFrames} fps={project.fps} />

        <Separator orientation="vertical" className="h-8" />

        {/* Timecode Display */}
        <TimecodeDisplay fps={project.fps} totalDuration={duration} />
      </div>
    </div>
  );
}
