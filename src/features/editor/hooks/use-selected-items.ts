import { useMemo, useRef } from 'react';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import type { TimelineItem } from '@/types/timeline';

/**
 * Hook to get selected items efficiently.
 *
 * Optimization: Uses stable reference comparison to prevent unnecessary re-renders.
 * Only returns a new array when the actual selected items have changed,
 * not when unrelated items in the timeline change.
 */
export function useSelectedItems(): TimelineItem[] {
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds);
  const items = useTimelineStore((s) => s.items);

  // Keep track of previous result for stable reference
  const prevResultRef = useRef<TimelineItem[]>([]);
  const prevIdsRef = useRef<string[]>([]);

  return useMemo(() => {
    // Quick check: if no selection, return stable empty array
    if (selectedItemIds.length === 0) {
      if (prevResultRef.current.length === 0) {
        return prevResultRef.current;
      }
      prevResultRef.current = [];
      prevIdsRef.current = [];
      return prevResultRef.current;
    }

    // Check if selection IDs have changed
    const idsChanged =
      selectedItemIds.length !== prevIdsRef.current.length ||
      selectedItemIds.some((id, i) => id !== prevIdsRef.current[i]);

    if (!idsChanged) {
      // Same IDs - check if any selected item's content has changed
      const selectedItems = items.filter(item => selectedItemIds.includes(item.id));

      // If same length and all items are reference-equal, return previous result
      if (selectedItems.length === prevResultRef.current.length) {
        const allSame = selectedItems.every((item, i) => item === prevResultRef.current[i]);
        if (allSame) {
          return prevResultRef.current;
        }
      }

      // Items changed, update cache
      prevResultRef.current = selectedItems;
      return selectedItems;
    }

    // IDs changed, recompute
    const selectedItems = items.filter(item => selectedItemIds.includes(item.id));
    prevResultRef.current = selectedItems;
    prevIdsRef.current = [...selectedItemIds];
    return selectedItems;
  }, [items, selectedItemIds]);
}

/**
 * Hook to get selected item IDs with stable reference.
 * Avoids re-renders when items change but selection doesn't.
 */
export function useSelectedItemIds(): string[] {
  return useSelectionStore((s) => s.selectedItemIds);
}
