import type { TimelineItem } from '@/types/timeline';
import { useTimelineZoom } from '../../hooks/use-timeline-zoom';
import { useSelectionStore } from '@/features/editor/stores/selection-store';

export interface TimelineItemProps {
  item: TimelineItem;
}

/**
 * Timeline Item Component
 *
 * Renders an individual item on the timeline:
 * - Positioned based on start frame (from)
 * - Width based on duration in frames
 * - Visual styling based on item type
 * - Selection state
 * - Click to select
 *
 * Future enhancements:
 * - Drag to move
 * - Resize handles
 * - Trim indicators
 * - Thumbnail preview
 */
export function TimelineItem({ item }: TimelineItemProps) {
  const { timeToPixels } = useTimelineZoom();
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds);
  const selectItems = useSelectionStore((s) => s.selectItems);

  const isSelected = selectedItemIds.includes(item.id);

  // Calculate position and width (convert frames to time)
  const left = timeToPixels(item.from);
  const width = timeToPixels(item.durationInFrames);

  // Get color based on item type
  const getItemColor = () => {
    switch (item.type) {
      case 'video':
        return 'bg-primary/30 border-primary';
      case 'audio':
        return 'bg-green-500/30 border-green-500';
      case 'image':
        return 'bg-blue-500/30 border-blue-500';
      case 'text':
        return `bg-purple-500/30 border-purple-500`;
      case 'shape':
        return 'bg-orange-500/30 border-orange-500';
      default:
        return 'bg-primary/30 border-primary';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.metaKey || e.ctrlKey) {
      // Multi-select: add to selection
      if (isSelected) {
        selectItems(selectedItemIds.filter((id) => id !== item.id));
      } else {
        selectItems([...selectedItemIds, item.id]);
      }
    } else {
      // Single select
      selectItems([item.id]);
    }
  };

  return (
    <div
      className={`
        absolute top-2 h-12 rounded overflow-hidden cursor-pointer transition-all
        ${getItemColor()}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
        hover:brightness-110
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onClick={handleClick}
    >
      {/* Item label */}
      <div className="px-2 py-1 text-xs font-medium text-primary-foreground truncate">
        {item.label}
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />

      {/* Resize handles (placeholder for future implementation) */}
      {isSelected && (
        <>
          {/* Left handle */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary cursor-ew-resize" />
          {/* Right handle */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary cursor-ew-resize" />
        </>
      )}
    </div>
  );
}
