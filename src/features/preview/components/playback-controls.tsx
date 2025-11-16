import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { usePlaybackLoop } from '@/features/preview/hooks/use-playback-loop';

interface PlaybackControlsProps {
  totalFrames: number;
  fps: number;
}

/**
 * Playback Controls Component
 *
 * Transport controls with:
 * - Play/Pause toggle
 * - Frame navigation (previous/next)
 * - Skip to start/end
 * - Volume control
 */
export function PlaybackControls({ totalFrames, fps }: PlaybackControlsProps) {
  // Use granular selectors - Zustand v5 best practice
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const volume = usePlaybackStore((s) => s.volume);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const setVolume = usePlaybackStore((s) => s.setVolume);

  // Handle automatic playback loop
  usePlaybackLoop({ totalFrames, fps });

  const handleGoToStart = () => setCurrentFrame(0);
  const handleGoToEnd = () => setCurrentFrame(totalFrames);
  const handlePreviousFrame = () => setCurrentFrame(Math.max(0, currentFrame - 1));
  const handleNextFrame = () => setCurrentFrame(Math.min(totalFrames, currentFrame + 1));

  return (
    <div className="h-16 border-t border-border panel-header flex items-center justify-center gap-6 px-6 flex-shrink-0">
      {/* Transport Controls */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleGoToStart}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to Start (Home)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handlePreviousFrame}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous Frame (←)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="h-11 w-11 glow-primary-sm"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause' : 'Play'} (Space)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleNextFrame}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next Frame (→)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleGoToEnd}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to End (End)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Volume Control */}
      <div className="flex items-center gap-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Volume2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Volume</TooltipContent>
        </Tooltip>
        <Slider
          value={[volume * 100]}
          onValueChange={(values) => setVolume((values[0] ?? 75) / 100)}
          max={100}
          step={1}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground font-mono w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
