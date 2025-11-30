import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';
import type { RemotionInputProps } from '@/types/export';
import type { TextItem, ShapeItem, TimelineItem } from '@/types/timeline';
import { Item, type MaskInfo } from '../components/item';
import { generateStableKey } from '../utils/generate-stable-key';
import { loadFonts } from '../utils/fonts';

/** Mask shape with its track order for scope calculation */
interface MaskWithTrackOrder {
  mask: ShapeItem;
  trackOrder: number;
}

/**
 * Check if a mask applies to a target item at the current frame.
 * A mask affects items when:
 * 1. Mask is on a track with lower order (visually above)
 * 2. Time ranges overlap at current frame
 */
function shouldApplyMask(
  mask: ShapeItem,
  maskTrackOrder: number,
  targetItem: TimelineItem,
  targetTrackOrder: number,
  currentFrame: number
): boolean {
  // Mask must be on a track above (lower order = higher visual position)
  if (maskTrackOrder >= targetTrackOrder) return false;

  // Check time overlap - item and mask must both be active at current frame
  const maskStart = mask.from;
  const maskEnd = mask.from + mask.durationInFrames;
  const targetStart = targetItem.from;
  const targetEnd = targetItem.from + targetItem.durationInFrames;

  // Current frame must be within both ranges
  return (
    currentFrame >= maskStart &&
    currentFrame < maskEnd &&
    currentFrame >= targetStart &&
    currentFrame < targetEnd
  );
}

/**
 * Main Remotion Composition
 *
 * Renders all tracks following Remotion best practices:
 * - Media items (video/audio) rendered at composition level for stable keys
 *   This prevents remounting when items are split or moved across tracks
 * - Non-media items (text, images, shapes) rendered per-track
 * - Z-index based on track order for proper layering (top track = highest z-index)
 * - Respects track visibility, mute, and solo states
 * - Pre-mounts media items 2 seconds early for smooth transitions
 */
export const MainComposition: React.FC<RemotionInputProps> = ({ tracks, backgroundColor = '#000000' }) => {
  const { fps } = useVideoConfig();
  const currentFrame = useCurrentFrame();
  const hasSoloTracks = tracks.some((track) => track.solo);

  // Calculate max order for z-index inversion (top track should have highest z-index)
  const maxOrder = Math.max(...tracks.map((t) => t.order ?? 0), 0);

  // Filter visible tracks (tracks are already sorted by store)
  const visibleTracks = tracks.filter((track) => {
    if (hasSoloTracks) return track.solo;
    return track.visible !== false;
  });

  // Collect ALL media items (video/audio) from visible tracks with z-index and mute state
  // Invert z-index: top track (order=0) gets highest z-index, bottom track gets lowest
  const mediaItems = visibleTracks.flatMap((track) =>
    track.items
      .filter((item) => item.type === 'video' || item.type === 'audio')
      .map((item) => ({
        ...item,
        zIndex: maxOrder - (track.order ?? 0),
        muted: track.muted,
      }))
  );

  // Collect all mask shapes with their track orders
  const allMasks: MaskWithTrackOrder[] = useMemo(() => {
    const masks: MaskWithTrackOrder[] = [];
    visibleTracks.forEach((track) => {
      track.items.forEach((item) => {
        if (item.type === 'shape' && item.isMask) {
          masks.push({
            mask: item,
            trackOrder: track.order ?? 0,
          });
        }
      });
    });
    return masks;
  }, [visibleTracks]);

  // Collect non-media items per track (text, image, shape)
  // Filter out mask shapes - they don't render visually
  const nonMediaByTrack = visibleTracks.map((track) => ({
    ...track,
    items: track.items.filter(
      (item) =>
        item.type !== 'video' &&
        item.type !== 'audio' &&
        !(item.type === 'shape' && item.isMask) // Exclude masks from rendering
    ),
  }));

  /**
   * Get masks that apply to a specific item at the current frame.
   * Returns MaskInfo array for the Item component.
   */
  const getMasksForItem = (item: TimelineItem, trackOrder: number): MaskInfo[] => {
    return allMasks
      .filter(({ mask, trackOrder: maskTrackOrder }) =>
        shouldApplyMask(mask, maskTrackOrder, item, trackOrder, currentFrame)
      )
      .map(({ mask }) => ({
        shape: mask,
        transform: mask.transform ?? {
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
        },
      }));
  };

  // Load fonts for all text items
  // This ensures Google Fonts are loaded before rendering
  useMemo(() => {
    const textItems = visibleTracks
      .flatMap((track) => track.items)
      .filter((item): item is TextItem => item.type === 'text');

    const fontFamilies = textItems
      .map((item) => item.fontFamily ?? 'Inter')
      .filter((font, index, arr) => arr.indexOf(font) === index); // unique

    if (fontFamilies.length > 0) {
      loadFonts(fontFamilies);
    }
  }, [visibleTracks]);

  // Check if any VIDEO items (not audio) are active at current frame
  // Used to render a clearing layer when no videos are visible
  const hasActiveVideo = mediaItems.some(
    (item) =>
      item.type === 'video' &&
      currentFrame >= item.from &&
      currentFrame < item.from + item.durationInFrames
  );

  return (
    <AbsoluteFill>
      {/* BACKGROUND LAYER - Ensures empty areas show canvas background color */}
      <AbsoluteFill style={{ backgroundColor, zIndex: -1 }} />

      {/* MEDIA LAYER - All video/audio at composition level (prevents cross-track remounts) */}
      {/* z-index: 0-999 range for media items */}
      {mediaItems.map((item) => {
        const premountFrames = Math.round(fps * 2);
        // Get masks that apply to this media item
        // Note: item.zIndex is inverted track order, so we need to find original track order
        const trackOrder = maxOrder - item.zIndex;
        const masks = getMasksForItem(item, trackOrder);
        return (
          <Sequence
            key={generateStableKey(item)}
            from={item.from}
            durationInFrames={item.durationInFrames}
            premountFor={premountFrames}
          >
            <AbsoluteFill style={{ zIndex: item.zIndex }}>
              <Item item={item} muted={item.muted} masks={masks} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* CLEARING LAYER - Paints background color over stale video frames when no videos are active */}
      {/* z-index: 1000 - above media (0-999), below non-media (1001+) */}
      {!hasActiveVideo && (
        <AbsoluteFill style={{ backgroundColor, zIndex: 1000 }} />
      )}

      {/* NON-MEDIA LAYERS - Track-based rendering for text/shapes/images */}
      {/* z-index: 1001+ range so they appear above clearing layer */}
      {/* Invert z-index: top track (order=0) gets highest z-index */}
      {nonMediaByTrack
        .filter((track) => track.items.length > 0)
        .map((track) => {
          const trackOrder = track.order ?? 0;
          return (
            <AbsoluteFill key={track.id} style={{ zIndex: 1001 + (maxOrder - trackOrder) }}>
              {track.items.map((item) => {
                const masks = getMasksForItem(item, trackOrder);
                return (
                  <Sequence
                    key={item.id}
                    from={item.from}
                    durationInFrames={item.durationInFrames}
                  >
                    <Item item={item} muted={false} masks={masks} />
                  </Sequence>
                );
              })}
            </AbsoluteFill>
          );
        })}
    </AbsoluteFill>
  );
};
