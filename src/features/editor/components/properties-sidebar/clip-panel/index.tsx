import { useMemo, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { useProjectStore } from '@/features/projects/stores/project-store';
import type { TransformProperties } from '@/types/transform';

import { SourceSection } from './source-section';
import { LayoutSection } from './layout-section';
import { FillSection } from './fill-section';
import { VideoSection } from './video-section';
import { AudioSection } from './audio-section';
import { TextSection } from './text-section';
import { ShapeSection } from './shape-section';
import { EffectsSection } from '@/features/effects/components/effects-section';

/**
 * Clip properties panel - shown when one or more clips are selected.
 * Displays and allows editing of clip transforms and media properties.
 */
export function ClipPanel() {
  // Granular selectors
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds);
  const items = useTimelineStore((s) => s.items);
  const fps = useTimelineStore((s) => s.fps);
  const updateItemsTransform = useTimelineStore((s) => s.updateItemsTransform);
  const currentProject = useProjectStore((s) => s.currentProject);

  // Get selected items
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  // Canvas settings
  const canvas = useMemo(
    () => ({
      width: currentProject?.metadata.width ?? 1920,
      height: currentProject?.metadata.height ?? 1080,
      fps: currentProject?.metadata.fps ?? 30,
    }),
    [currentProject]
  );

  // Check if selection includes visual items (not just audio)
  const hasVisualItems = useMemo(
    () => selectedItems.some((item) => item.type !== 'audio'),
    [selectedItems]
  );

  // Check if selection includes video items
  const hasVideoItems = useMemo(
    () => selectedItems.some((item) => item.type === 'video'),
    [selectedItems]
  );

  // Check if selection includes audio-capable items
  const hasAudioItems = useMemo(
    () =>
      selectedItems.some(
        (item) => item.type === 'video' || item.type === 'audio'
      ),
    [selectedItems]
  );

  // Check if selection includes text items
  const hasTextItems = useMemo(
    () => selectedItems.some((item) => item.type === 'text'),
    [selectedItems]
  );

  // Check if selection includes shape items
  const hasShapeItems = useMemo(
    () => selectedItems.some((item) => item.type === 'shape'),
    [selectedItems]
  );

  // Check if selection includes adjustment items
  const hasAdjustmentItems = useMemo(
    () => selectedItems.some((item) => item.type === 'adjustment'),
    [selectedItems]
  );

  // Check if selection is only adjustment items (no layout/fill controls needed)
  const isOnlyAdjustmentItems = useMemo(
    () => selectedItems.length > 0 && selectedItems.every((item) => item.type === 'adjustment'),
    [selectedItems]
  );

  // Memoized filtered arrays for child components - prevents new array creation each render
  const layoutFillItems = useMemo(
    () => selectedItems.filter((item) => item.type !== 'audio' && item.type !== 'adjustment'),
    [selectedItems]
  );

  const visualItems = useMemo(
    () => selectedItems.filter((item) => item.type !== 'audio'),
    [selectedItems]
  );

  // Check if selection is only text/shape items (no aspect ratio lock by default)
  const isOnlyTextOrShape = useMemo(
    () => selectedItems.length > 0 && selectedItems.every(
      (item) => item.type === 'text' || item.type === 'shape'
    ),
    [selectedItems]
  );

  // Compute aspectLocked from items' transforms
  // If any item has explicit aspectRatioLocked, use that; otherwise use default based on type
  const aspectLocked = useMemo(() => {
    if (selectedItems.length === 0) return true;

    // Check if any item has explicit aspectRatioLocked set
    const firstWithExplicit = selectedItems.find(
      (item) => item.transform?.aspectRatioLocked !== undefined
    );
    if (firstWithExplicit) {
      return firstWithExplicit.transform!.aspectRatioLocked!;
    }

    // Default based on item types: text/shape = unlocked, others = locked
    return !isOnlyTextOrShape;
  }, [selectedItems, isOnlyTextOrShape]);

  // Toggle aspect lock - updates all selected items' transforms
  const handleAspectLockToggle = useCallback(() => {
    const newValue = !aspectLocked;
    const itemIds = selectedItems.map((item) => item.id);
    updateItemsTransform(itemIds, { aspectRatioLocked: newValue });
  }, [aspectLocked, selectedItems, updateItemsTransform]);

  // Handle transform changes
  const handleTransformChange = useCallback(
    (ids: string[], updates: Partial<TransformProperties>) => {
      updateItemsTransform(ids, updates);
    },
    [updateItemsTransform]
  );

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Source info - always shown */}
      <SourceSection items={selectedItems} fps={fps} />

      <Separator />

      {/* Layout - only for visual items that have canvas position (not adjustment layers) */}
      {hasVisualItems && !isOnlyAdjustmentItems && (
        <>
          <LayoutSection
            items={layoutFillItems}
            canvas={canvas}
            onTransformChange={handleTransformChange}
            aspectLocked={aspectLocked}
            onAspectLockToggle={handleAspectLockToggle}
          />
          <Separator />
        </>
      )}

      {/* Fill - only for visual items that have canvas position (not adjustment layers) */}
      {hasVisualItems && !isOnlyAdjustmentItems && (
        <>
          <FillSection
            items={layoutFillItems}
            canvas={canvas}
            onTransformChange={handleTransformChange}
          />
          <Separator />
        </>
      )}

      {/* Effects - for visual items and adjustment layers */}
      {hasVisualItems && (
        <>
          {/* Explanatory text for adjustment layers */}
          {hasAdjustmentItems && (
            <div className="px-1 py-2 text-xs text-muted-foreground bg-purple-500/10 rounded border border-purple-500/20 mb-2">
              Effects on adjustment layers apply to all items on tracks above.
            </div>
          )}
          <EffectsSection
            items={visualItems}
          />
          <Separator />
        </>
      )}

      {/* Text - only for text items */}
      {hasTextItems && (
        <>
          <TextSection items={selectedItems} />
          <Separator />
        </>
      )}

      {/* Shape - only for shape items */}
      {hasShapeItems && (
        <>
          <ShapeSection items={selectedItems} />
          <Separator />
        </>
      )}

      {/* Video - only for video items */}
      {hasVideoItems && (
        <>
          <VideoSection items={selectedItems} />
          <Separator />
        </>
      )}

      {/* Audio - for video and audio items */}
      {hasAudioItems && <AudioSection items={selectedItems} />}
    </div>
  );
}
