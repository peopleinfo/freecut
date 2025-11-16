import type { TimelineItem } from '@/types/timeline';

export function calculateItemDuration(item: TimelineItem): number {
  return item.durationInFrames;
}

export function isItemOverlapping(item1: TimelineItem, item2: TimelineItem): boolean {
  // Check if items are on the same track
  if (item1.trackId !== item2.trackId) {
    return false;
  }

  const item1End = item1.from + item1.durationInFrames;
  const item2End = item2.from + item2.durationInFrames;

  // Check for overlap
  return item1.from < item2End && item2.from < item1End;
}

export function splitItem(item: TimelineItem, splitFrame: number): [TimelineItem, TimelineItem] | null {
  // Check if split point is within the item
  if (splitFrame <= item.from || splitFrame >= item.from + item.durationInFrames) {
    return null;
  }

  const firstPartDuration = splitFrame - item.from;
  const secondPartDuration = item.durationInFrames - firstPartDuration;

  const firstPart: TimelineItem = {
    ...item,
    id: `${item.id}-1`,
    durationInFrames: firstPartDuration,
  };

  const secondPart: TimelineItem = {
    ...item,
    id: `${item.id}-2`,
    from: splitFrame,
    durationInFrames: secondPartDuration,
  };

  return [firstPart, secondPart];
}
