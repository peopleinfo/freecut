import { memo, useEffect, useState, useMemo, useDeferredValue } from 'react';
import { FilmstripSkeleton } from './filmstrip-skeleton';
import { useFilmstrip, type FilmstripFrame } from '../../hooks/use-filmstrip';
import { mediaLibraryService } from '@/features/media-library/services/media-library-service';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../services/filmstrip-cache';
import { useTimelineScrollContextOptional } from '../../contexts/timeline-scroll-context';

export interface ClipFilmstripProps {
  /** Media ID from the timeline item */
  mediaId: string;
  /** Width of the clip in pixels */
  clipWidth: number;
  /** Source start time in seconds (for trimmed clips) */
  sourceStart: number;
  /** Total source duration in seconds */
  sourceDuration: number;
  /** Trim start in seconds (how much trimmed from beginning) */
  trimStart: number;
  /** Playback speed multiplier */
  speed: number;
  /** Frames per second */
  fps: number;
  /** Whether the clip is visible (from IntersectionObserver) */
  isVisible: boolean;
  /** Pixels per second from parent (avoids redundant zoom subscription) */
  pixelsPerSecond: number;
  /** Position of the clip's left edge in timeline pixels (for viewport culling) */
  clipLeftPosition: number;
  /** Optional height override */
  height?: number;
  /** Optional className for positioning */
  className?: string;
}

/**
 * Find closest frame using binary search
 */
function findClosestFrame(frames: FilmstripFrame[], targetTime: number): FilmstripFrame | null {
  if (frames.length === 0) return null;

  let left = 0;
  let right = frames.length - 1;
  let bestFrame = frames[0]!;
  let bestDiff = Math.abs(bestFrame.timestamp - targetTime);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const frame = frames[mid]!;
    const diff = Math.abs(frame.timestamp - targetTime);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestFrame = frame;
    }

    if (frame.timestamp < targetTime) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return bestFrame;
}

/**
 * Simple filmstrip tile - memoized to prevent unnecessary re-renders
 */
const FilmstripTile = memo(function FilmstripTile({
  src,
  x,
}: {
  src: string;
  x: number;
}) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute top-0"
      style={{
        left: x,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        objectFit: 'cover',
      }}
    />
  );
});

/**
 * Clip Filmstrip Component
 *
 * Renders video frame thumbnails as a tiled filmstrip.
 * Uses useDeferredValue to keep zoom interactions responsive.
 */
export const ClipFilmstrip = memo(function ClipFilmstrip({
  mediaId,
  clipWidth,
  sourceStart,
  sourceDuration,
  trimStart,
  speed,
  fps: _fps,
  isVisible,
  pixelsPerSecond,
  clipLeftPosition,
  height = THUMBNAIL_HEIGHT,
  className = 'top-1',
}: ClipFilmstripProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Get scroll context for viewport-based tile culling
  const { scrollLeft, viewportWidth } = useTimelineScrollContextOptional();

  // Defer zoom values to keep zoom slider responsive
  const deferredPixelsPerSecond = useDeferredValue(pixelsPerSecond);
  const deferredClipWidth = useDeferredValue(clipWidth);
  const deferredClipLeftPosition = useDeferredValue(clipLeftPosition);

  // Load blob URL for the media
  useEffect(() => {
    let mounted = true;

    const loadBlobUrl = async () => {
      try {
        const url = await mediaLibraryService.getMediaBlobUrl(mediaId);
        if (mounted && url) {
          setBlobUrl(url);
        }
      } catch (error) {
        console.error('Failed to load media blob URL:', error);
      }
    };

    if (isVisible && mediaId) {
      loadBlobUrl();
    }

    return () => {
      mounted = false;
    };
  }, [mediaId, isVisible]);

  // Use filmstrip hook
  const { frames, isComplete, error } = useFilmstrip({
    mediaId,
    blobUrl,
    duration: sourceDuration,
    isVisible,
    enabled: isVisible && !!blobUrl && sourceDuration > 0,
  });

  // Calculate visible tiles only - viewport culling for performance
  // Only render tiles that are within the visible viewport + overscan buffer
  const tiles = useMemo(() => {
    if (!frames || frames.length === 0) return [];

    const effectiveStart = sourceStart + trimStart;
    const tileCount = Math.ceil(deferredClipWidth / THUMBNAIL_WIDTH);
    const result: { tileIndex: number; frame: FilmstripFrame; x: number }[] = [];

    // Calculate visible range relative to this clip's position
    // Overscan: render 2 extra tiles on each side for smooth scrolling
    const overscan = THUMBNAIL_WIDTH * 2;
    const visibleStart = scrollLeft - deferredClipLeftPosition - overscan;
    const visibleEnd = scrollLeft - deferredClipLeftPosition + viewportWidth + overscan;

    for (let tile = 0; tile < tileCount; tile++) {
      const tileX = tile * THUMBNAIL_WIDTH;
      const tileRight = tileX + THUMBNAIL_WIDTH;

      // Skip tiles outside visible range
      if (tileRight < visibleStart || tileX > visibleEnd) {
        continue;
      }

      const tileTime = effectiveStart + (tileX / deferredPixelsPerSecond) * speed;
      const frame = findClosestFrame(frames, tileTime);

      if (frame) {
        result.push({ tileIndex: tile, frame, x: tileX });
      }
    }

    return result;
  }, [frames, deferredClipWidth, deferredPixelsPerSecond, sourceStart, trimStart, speed, scrollLeft, viewportWidth, deferredClipLeftPosition]);

  if (error) {
    return null;
  }

  // Show skeleton only if no frames yet
  if (!frames || frames.length === 0) {
    return <FilmstripSkeleton clipWidth={clipWidth} height={height} className={className} />;
  }

  return (
    <>
      {/* Show shimmer skeleton behind while loading */}
      {!isComplete && (
        <FilmstripSkeleton clipWidth={clipWidth} height={height} className={className} />
      )}
      <div
        className={`absolute left-0 ${className} overflow-hidden pointer-events-none`}
        style={{ width: deferredClipWidth, height }}
      >
        {tiles.map(({ tileIndex, frame, x }) => (
          <FilmstripTile key={tileIndex} src={frame.url} x={x} />
        ))}
      </div>
    </>
  );
});

export { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT };
