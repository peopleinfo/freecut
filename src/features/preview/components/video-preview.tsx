import { useRef, useEffect, useState, useMemo } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Maximize2 } from 'lucide-react';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { MainComposition } from '@/lib/remotion/compositions/main-composition';
import { useRemotionPlayer } from '../hooks/use-remotion-player';
import { resolveMediaUrls, cleanupBlobUrls } from '../utils/media-resolver';
import { PreviewZoomControls } from './preview-zoom-controls';
import type { TimelineTrack } from '@/types/timeline';

interface VideoPreviewProps {
  project: {
    width: number;
    height: number;
  };
}

/**
 * Video Preview Component
 *
 * Displays the Remotion Player with:
 * - Real-time video rendering
 * - Bidirectional sync with timeline
 * - User-controlled zoom
 * - Frame counter
 * - Fullscreen toggle
 */
export function VideoPreview({ project }: VideoPreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Granular selectors
  const fps = useTimelineStore((s) => s.fps);
  const tracks = useTimelineStore((s) => s.tracks);
  const items = useTimelineStore((s) => s.items);
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const zoom = usePlaybackStore((s) => s.zoom);

  // Remotion Player integration
  const { isPlaying } = useRemotionPlayer(playerRef);

  // State for resolved tracks (with blob URLs)
  const [resolvedTracks, setResolvedTracks] = useState<TimelineTrack[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Combine tracks and items into TimelineTrack format
  // Sort in descending order so Track 1 (order: 0) renders last and appears on top
  const combinedTracks = useMemo(() => {
    return tracks
      .map((track) => ({
        ...track,
        items: items.filter((item) => item.trackId === track.id),
      }))
      .sort((a, b) => b.order - a.order);
  }, [tracks, items]);

  // Calculate total frames from items
  const totalFrames = useMemo(() => {
    if (items.length === 0) return 900; // Default 30s at 30fps
    return Math.max(...items.map((item) => item.from + item.durationInFrames));
  }, [items]);

  // Cleanup on mount to clear any stale blob URLs from previous sessions
  // Add small delay to allow garbage collection of old Blob objects
  useEffect(() => {
    cleanupBlobUrls();
    setResolvedTracks([]);

    // Small delay to allow GC to clear Blob references before creating new ones
    const cleanup = setTimeout(() => {
      // Trigger GC hint (if available in dev tools)
      if (typeof globalThis.gc === 'function') {
        globalThis.gc();
      }
    }, 100);

    return () => clearTimeout(cleanup);
  }, []);

  // Resolve media URLs when tracks/items change
  useEffect(() => {
    let isCancelled = false;

    async function resolve() {
      if (combinedTracks.length === 0) {
        setResolvedTracks([]);
        return;
      }

      setIsResolving(true);

      // Small delay before resolving to allow cleanup and GC
      await new Promise(resolve => setTimeout(resolve, 150));

      if (isCancelled) return;

      try {
        const resolved = await resolveMediaUrls(combinedTracks);
        if (!isCancelled) {
          setResolvedTracks(resolved);
        }
      } catch (error) {
        console.error('Failed to resolve media URLs:', error);
        if (!isCancelled) {
          setResolvedTracks(combinedTracks); // Fallback to unresolved
        }
      } finally {
        if (!isCancelled) {
          setIsResolving(false);
        }
      }
    }

    resolve();

    return () => {
      isCancelled = true;
    };
  }, [combinedTracks]);

  // Cleanup blob URLs and clear state on unmount
  useEffect(() => {
    return () => {
      cleanupBlobUrls();
      setResolvedTracks([]);
    };
  }, []);

  // Memoize inputProps to prevent Player from re-rendering
  const inputProps = useMemo(() => ({
    fps,
    tracks: resolvedTracks,
  }), [fps, resolvedTracks]);

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/20 relative">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10">
        <PreviewZoomControls
          containerWidth={containerRef.current?.clientWidth}
          containerHeight={containerRef.current?.clientHeight}
          projectWidth={project.width}
          projectHeight={project.height}
        />
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-6xl max-h-full"
        style={{
          aspectRatio: `${project.width || 16}/${project.height || 9}`,
        }}
      >
        {/* Remotion Player with Zoom */}
        <div
          className="w-full h-full rounded-lg overflow-hidden bg-black border-2 border-border shadow-2xl"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {isResolving && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <p className="text-white text-sm">Loading media...</p>
            </div>
          )}

          <Player
            key="remotion-player"
            ref={playerRef}
            component={MainComposition}
            inputProps={inputProps}
            durationInFrames={totalFrames}
            compositionWidth={project.width}
            compositionHeight={project.height}
            fps={fps}
            style={{
              width: '100%',
              height: '100%',
            }}
            controls={false}
            loop={false}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
            errorFallback={({ error }) => (
              <div className="flex items-center justify-center h-full bg-red-500/10">
                <p className="text-red-500">Player Error: {error.message}</p>
              </div>
            )}
          />
        </div>

        {/* Frame Counter */}
        <div className="absolute -bottom-7 right-0 font-mono text-xs text-primary tabular-nums flex items-center gap-2">
          <span className="text-muted-foreground">Frame:</span>
          <span className="font-medium">
            {String(currentFrame).padStart(5, '0')} /{' '}
            {String(totalFrames).padStart(5, '0')}
          </span>
        </div>

        {/* Fullscreen toggle - handler pending implementation */}
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
  );
}
