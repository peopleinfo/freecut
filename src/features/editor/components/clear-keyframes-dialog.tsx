import { create } from 'zustand';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { PROPERTY_LABELS, type AnimatableProperty } from '@/types/keyframe';

interface ClearKeyframesDialogState {
  isOpen: boolean;
  itemIds: string[];
  /** If set, only clear this property's keyframes; otherwise clear all */
  property: AnimatableProperty | null;
  /** Open dialog to clear all keyframes for given items */
  openClearAll: (itemIds: string[]) => void;
  /** Open dialog to clear keyframes for a specific property */
  openClearProperty: (itemIds: string[], property: AnimatableProperty) => void;
  close: () => void;
}

/**
 * Store for managing clear keyframes confirmation dialog state.
 * Allows the dialog to be triggered from hotkeys and context menus without prop drilling.
 */
export const useClearKeyframesDialogStore = create<ClearKeyframesDialogState>((set) => ({
  isOpen: false,
  itemIds: [],
  property: null,
  openClearAll: (itemIds) => set({ isOpen: true, itemIds, property: null }),
  openClearProperty: (itemIds, property) => set({ isOpen: true, itemIds, property }),
  close: () => set({ isOpen: false, itemIds: [], property: null }),
}));

/**
 * Confirmation dialog for clearing keyframes from selected items.
 * Triggered by Shift+K hotkey or context menu actions.
 */
export function ClearKeyframesDialog() {
  const isOpen = useClearKeyframesDialogStore((s) => s.isOpen);
  const itemIds = useClearKeyframesDialogStore((s) => s.itemIds);
  const property = useClearKeyframesDialogStore((s) => s.property);
  const close = useClearKeyframesDialogStore((s) => s.close);

  const handleConfirm = () => {
    if (property) {
      // Clear keyframes for specific property
      const removeKeyframesForProperty = useTimelineStore.getState().removeKeyframesForProperty;
      for (const itemId of itemIds) {
        removeKeyframesForProperty(itemId, property);
      }
    } else {
      // Clear all keyframes
      const removeKeyframesForItem = useTimelineStore.getState().removeKeyframesForItem;
      for (const itemId of itemIds) {
        removeKeyframesForItem(itemId);
      }
    }
    close();
  };

  const itemCount = itemIds.length;
  const itemText = itemCount === 1 ? 'clip' : 'clips';
  const propertyLabel = property ? PROPERTY_LABELS[property] : null;

  const title = property ? `Clear ${propertyLabel} Keyframes` : 'Clear All Keyframes';
  const description = property
    ? `Are you sure you want to clear all ${propertyLabel} keyframes from ${itemCount} ${itemText}?`
    : `Are you sure you want to clear all keyframes from ${itemCount} ${itemText}?`;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              This action can be undone with Ctrl+Z.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Clear Keyframes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
