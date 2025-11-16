import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  Film,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Video,
  Music,
  MessageSquare,
  Eye,
  Lock,
} from 'lucide-react';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';

interface TimelineSectionProps {
  project: {
    fps: number;
  };
}

export function TimelineSection({ project }: TimelineSectionProps) {
  // Use granular selectors - Zustand v5 best practice
  const zoomLevel = useTimelineStore((s) => s.zoomLevel);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);

  // TODO: Integrate with actual timeline store
  const totalFrames = 900; // 30 seconds at 30fps
  const duration = totalFrames / (project.fps || 30);

  return (
    <div className="timeline-bg h-72 border-t border-border flex flex-col flex-shrink-0">
      {/* Timeline Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
            <Film className="w-3 h-3" />
            Timeline
          </h2>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.max(0.1, zoomLevel - 0.1))}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Slider
              value={[zoomLevel]}
              onValueChange={(values) => setZoom(values[0] ?? 1)}
              min={0.1}
              max={2}
              step={0.1}
              className="w-24"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.min(2, zoomLevel + 0.1))}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground font-mono w-12 text-right">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        </div>

        {/* Timeline Tools */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Grid3x3 className="w-3 h-3 mr-1.5" />
                Snap
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snap to Grid</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-36 border-r border-border panel-bg flex-shrink-0">
          <div className="h-11 flex items-center px-3 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Tracks
            </span>
          </div>

          {/* Track labels */}
          <div className="space-y-px">
            {/* Video Track 1 */}
            <div className="h-16 flex items-center justify-between px-3 video-track border-b border-border group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Video className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium font-mono truncate">
                  Video 1
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Lock className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Audio Track 1 */}
            <div className="h-16 flex items-center justify-between px-3 audio-track border-b border-border group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Music className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium font-mono truncate">
                  Audio 1
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Lock className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Subtitle Track */}
            <div className="h-14 flex items-center justify-between px-3 subtitle-track border-b border-border group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium font-mono truncate">
                  Subtitles
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Lock className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-background/30">
          {/* Ruler */}
          <div className="h-11 bg-secondary/20 border-b border-border relative">
            {/* Time markers */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-l border-border/50 relative"
                  style={{ width: `${zoomLevel * 100}px` }}
                >
                  <span className="absolute top-2 left-2 font-mono text-xs text-muted-foreground tabular-nums">
                    {i}s
                  </span>
                  {/* Frame ticks */}
                  <div className="absolute top-7 left-0 right-0 flex justify-between px-0.5">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <div key={j} className="w-px h-1.5 bg-border/40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Playhead in ruler */}
            <div
              className="absolute top-0 bottom-0 w-0.5 playhead pointer-events-none z-20"
              style={{
                left: `${(currentFrame / totalFrames) * duration * zoomLevel * 100}px`,
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 playhead rotate-45 rounded-sm" />
            </div>
          </div>

          {/* Track lanes */}
          <div className="relative">
            {/* Video track lane */}
            <div className="h-16 border-b border-border video-track relative">
              {/* Example clip */}
              <div
                className="absolute top-2 h-12 bg-primary/30 border border-primary rounded overflow-hidden cursor-pointer hover:bg-primary/40 transition-colors"
                style={{ left: '100px', width: '300px' }}
              >
                <div className="px-2 py-1 text-xs font-medium text-primary-foreground truncate">
                  intro.mp4
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Audio track lane */}
            <div className="h-16 border-b border-border audio-track relative">
              {/* Waveform visualization */}
              <div className="absolute inset-0 flex items-center px-2 opacity-20">
                <svg
                  className="w-full h-10"
                  preserveAspectRatio="none"
                  viewBox="0 0 1000 100"
                >
                  <path
                    d="M0 50 Q25 20, 50 50 T100 50 T150 50 T200 50 T250 50 T300 50 T350 50 T400 50 T450 50 T500 50 T550 50 T600 50 T650 50 T700 50 T750 50 T800 50 T850 50 T900 50 T950 50 T1000 50"
                    stroke="currentColor"
                    className="text-green-400"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Subtitle track lane */}
            <div className="h-14 border-b border-border subtitle-track relative" />

            {/* Playhead line through all tracks */}
            <div
              className="absolute top-0 bottom-0 w-0.5 playhead pointer-events-none z-10"
              style={{
                left: `${(currentFrame / totalFrames) * duration * zoomLevel * 100}px`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
