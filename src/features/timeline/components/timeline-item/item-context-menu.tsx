import { memo, ReactNode, useMemo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { PROPERTY_LABELS, type AnimatableProperty } from '@/types/keyframe';
import type { PropertyKeyframes } from '@/types/keyframe';

interface ItemContextMenuProps {
  children: ReactNode;
  trackLocked: boolean;
  isSelected: boolean;
  canJoinSelected: boolean;
  /** Keyframed properties for the item (used to build clear submenu) */
  keyframedProperties?: PropertyKeyframes[];
  onJoinSelected: () => void;
  onRippleDelete: () => void;
  onDelete: () => void;
  onClearAllKeyframes?: () => void;
  onClearPropertyKeyframes?: (property: AnimatableProperty) => void;
}

/**
 * Context menu for timeline items
 * Provides delete, ripple delete, join, and keyframe clearing operations
 */
export const ItemContextMenu = memo(function ItemContextMenu({
  children,
  trackLocked,
  isSelected,
  canJoinSelected,
  keyframedProperties,
  onJoinSelected,
  onRippleDelete,
  onDelete,
  onClearAllKeyframes,
  onClearPropertyKeyframes,
}: ItemContextMenuProps) {
  // Filter to only properties that actually have keyframes
  const propertiesWithKeyframes = useMemo(() => {
    if (!keyframedProperties) return [];
    return keyframedProperties.filter(p => p.keyframes.length > 0);
  }, [keyframedProperties]);

  const hasKeyframes = propertiesWithKeyframes.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={trackLocked}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {canJoinSelected && (
          <>
            <ContextMenuItem onClick={onJoinSelected}>
              Join Selected
              <ContextMenuShortcut>J</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Clear Keyframes submenu - only show if item has keyframes */}
        {hasKeyframes && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Clear Keyframes</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={onClearAllKeyframes}>
                  Clear All
                  <ContextMenuShortcut>Shift+K</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                {propertiesWithKeyframes.map(({ property }) => (
                  <ContextMenuItem
                    key={property}
                    onClick={() => onClearPropertyKeyframes?.(property)}
                  >
                    {PROPERTY_LABELS[property]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem
          onClick={onRippleDelete}
          disabled={!isSelected}
          className="text-destructive focus:text-destructive"
        >
          Ripple Delete
          <ContextMenuShortcut>Ctrl+Del</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          disabled={!isSelected}
          className="text-destructive focus:text-destructive"
        >
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
