import type { TimelineClip } from '@/types/timeline';
import { useTimelineZoom } from '../../hooks/use-timeline-zoom';
import { useTimelineStore } from '../../stores/timeline-store';

export interface TimelineItemProps {
  clip: TimelineClip;
}

/**
 * Timeline Item Component
 *
 * Renders an individual clip on the timeline:
 * - Positioned based on start time
 * - Width based on duration
 * - Visual styling based on clip type
 * - Selection state
 * - Click to select
 *
 * Future enhancements:
 * - Drag to move
 * - Resize handles
 * - Trim indicators
 * - Thumbnail preview
 */
export function TimelineItem({ clip }: TimelineItemProps) {
  const { timeToPixels } = useTimelineZoom();
  const selectedItemIds = useTimelineStore((s) => s.selectedItemIds);
  const selectItems = useTimelineStore((s) => s.selectItems);

  const isSelected = selectedItemIds.includes(clip.id);

  // Calculate position and width
  const left = timeToPixels(clip.start);
  const width = timeToPixels(clip.duration);

  // Get color based on clip type or custom color
  const getClipColor = () => {
    if (clip.color) return clip.color;

    switch (clip.type) {
      case 'video':
        return 'bg-primary/30 border-primary';
      case 'audio':
        return 'bg-green-500/30 border-green-500';
      case 'image':
        return 'bg-blue-500/30 border-blue-500';
      default:
        return 'bg-primary/30 border-primary';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.metaKey || e.ctrlKey) {
      // Multi-select: add to selection
      if (isSelected) {
        selectItems(selectedItemIds.filter((id) => id !== clip.id));
      } else {
        selectItems([...selectedItemIds, clip.id]);
      }
    } else {
      // Single select
      selectItems([clip.id]);
    }
  };

  return (
    <div
      className={`
        absolute top-2 h-12 rounded overflow-hidden cursor-pointer transition-all
        ${getClipColor()}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
        hover:brightness-110
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onClick={handleClick}
    >
      {/* Clip label */}
      <div className="px-2 py-1 text-xs font-medium text-primary-foreground truncate">
        {clip.label}
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
