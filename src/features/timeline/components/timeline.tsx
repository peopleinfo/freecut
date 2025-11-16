import { Button } from '@/components/ui/button';
import { Layers, Eye, Lock } from 'lucide-react';
import { TimelineHeader } from './timeline-header';
import { TimelineContent } from './timeline-content';
import { useTimelineTracks } from '../hooks/use-timeline-tracks';

export interface TimelineProps {
  duration: number; // Total timeline duration in seconds
}

/**
 * Complete Timeline Component
 *
 * Combines:
 * - TimelineHeader (controls, zoom, snap)
 * - Track Headers Sidebar (track labels and controls)
 * - TimelineContent (markers, playhead, tracks, items)
 *
 * Follows modular architecture with granular Zustand selectors
 */
export function Timeline({ duration }: TimelineProps) {
  const { tracks, toggleTrackLock, toggleTrackMute } = useTimelineTracks();

  return (
    <div className="timeline-bg h-72 border-t border-border flex flex-col flex-shrink-0">
      {/* Timeline Header */}
      <TimelineHeader />

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Sidebar */}
        <div className="w-36 border-r border-border panel-bg flex-shrink-0">
          {/* Tracks label */}
          <div className="h-11 flex items-center px-3 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Tracks
            </span>
          </div>

          {/* Track labels */}
          <div className="space-y-px">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between px-3 border-b border-border group"
                style={{ height: `${track.height}px` }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium font-mono truncate">
                    {track.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleTrackMute(track.id)}
                  >
                    <Eye
                      className={`w-3 h-3 ${track.muted ? 'opacity-30' : ''}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleTrackLock(track.id)}
                  >
                    <Lock
                      className={`w-3 h-3 ${track.locked ? 'text-primary' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Canvas */}
        <TimelineContent duration={duration} />
      </div>
    </div>
  );
}
