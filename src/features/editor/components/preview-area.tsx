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
  Maximize2,
} from 'lucide-react';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';

interface PreviewAreaProps {
  project: {
    width: number;
    height: number;
    fps: number;
  };
}

export function PreviewArea({ project }: PreviewAreaProps) {
  // Use granular selectors - Zustand v5 best practice
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const volume = usePlaybackStore((s) => s.volume);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame);
  const setVolume = usePlaybackStore((s) => s.setVolume);

  // TODO: Integrate with actual timeline store
  const totalFrames = 900; // 30 seconds at 30fps
  const duration = totalFrames / (project?.fps || 30);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/20">
        <div
          className="relative w-full max-w-6xl"
          style={{
            aspectRatio: `${project?.width || 16}/${project?.height || 9}`,
          }}
        >
          {/* Video Preview Canvas */}
          <div className="absolute inset-0 rounded-lg overflow-hidden bg-black border-2 border-border shadow-2xl">
            {/* Placeholder */}
            <div className="w-full h-full bg-gradient-to-br from-secondary/40 to-background/60 flex items-center justify-center relative">
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-[0.03]">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, oklch(0.95 0 0) 1px, transparent 1px),
                      linear-gradient(to bottom, oklch(0.95 0 0) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                  }}
                />
              </div>

              <div className="text-center relative z-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary ml-1" />
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  Preview Canvas
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {project?.width}×{project?.height}
                </p>
              </div>

              {/* Corner rulers for professional feel */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/20" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary/20" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary/20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/20" />
            </div>
          </div>

          {/* Frame Counter */}
          <div className="absolute -bottom-7 right-0 font-mono text-xs text-primary tabular-nums flex items-center gap-2">
            <span className="text-muted-foreground">Frame:</span>
            <span className="font-medium">
              {String(currentFrame).padStart(5, '0')} /{' '}
              {String(totalFrames).padStart(5, '0')}
            </span>
          </div>

          {/* Fullscreen toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fullscreen Preview</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="h-16 border-t border-border panel-header flex items-center justify-center gap-6 px-6 flex-shrink-0">
        {/* Transport Controls */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentFrame(0)}
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
                onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
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
                onClick={() =>
                  setCurrentFrame(Math.min(totalFrames, currentFrame + 1))
                }
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
                onClick={() => setCurrentFrame(totalFrames)}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to End (End)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Timecode Display */}
        <div className="px-4 py-2.5 bg-secondary/50 rounded-md border border-border">
          <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
            <span className="text-primary font-semibold">
              {Math.floor(currentFrame / (project.fps || 30))
                .toString()
                .padStart(2, '0')}
              :
              {Math.floor(
                ((currentFrame % (project.fps || 30)) / (project.fps || 30)) *
                  60
              )
                .toString()
                .padStart(2, '0')}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">
              {Math.floor(duration).toString().padStart(2, '0')}:
              {Math.floor((duration % 1) * 60)
                .toString()
                .padStart(2, '0')}
            </span>
          </div>
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
    </div>
  );
}
