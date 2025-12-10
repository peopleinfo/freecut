import { useCallback } from 'react';
import { useGizmoStore } from '@/features/preview/stores/gizmo-store';

/**
 * Hook for handling live property changes with preview system.
 * Consolidates the common pattern of:
 * 1. onLiveChange: Sets preview during drag
 * 2. onChange: Commits value and clears preview
 *
 * @param itemIds - Array of item IDs to apply changes to
 * @param property - Property key to update
 * @param onUpdate - Callback to commit the value to the store
 * @returns Tuple of [onLiveChange, onChange] handlers
 *
 * @example
 * ```tsx
 * const [onFillLive, onFillCommit] = useLivePropertyChange(
 *   itemIds,
 *   'fillColor',
 *   (v) => updateShapeItems({ fillColor: v })
 * );
 *
 * <ColorPicker
 *   color={fillColor}
 *   onChange={onFillCommit}
 *   onLiveChange={onFillLive}
 * />
 * ```
 */
export function useLivePropertyChange<T>(
  itemIds: string[],
  property: string,
  onUpdate: (value: T) => void
): [(value: T) => void, (value: T) => void] {
  const setPropertiesPreviewNew = useGizmoStore((s) => s.setPropertiesPreviewNew);
  const clearPreview = useGizmoStore((s) => s.clearPreview);

  const onLiveChange = useCallback(
    (value: T) => {
      const previews: Record<string, Record<string, T>> = {};
      itemIds.forEach((id) => {
        previews[id] = { [property]: value };
      });
      setPropertiesPreviewNew(previews);
    },
    [itemIds, property, setPropertiesPreviewNew]
  );

  const onChange = useCallback(
    (value: T) => {
      onUpdate(value);
      queueMicrotask(() => clearPreview());
    },
    [onUpdate, clearPreview]
  );

  return [onLiveChange, onChange];
}

/**
 * Hook for handling live transform changes with preview system.
 * Similar to useLivePropertyChange but uses the transform preview store.
 *
 * @param itemIds - Array of item IDs to apply changes to
 * @param property - Transform property key (x, y, width, height, rotation, etc.)
 * @param onUpdate - Callback to commit the value to the store
 * @returns Tuple of [onLiveChange, onChange] handlers
 */
export function useLiveTransformChange<T>(
  itemIds: string[],
  property: string,
  onUpdate: (value: T) => void
): [(value: T) => void, (value: T) => void] {
  const setTransformPreview = useGizmoStore((s) => s.setTransformPreview);
  const clearPreview = useGizmoStore((s) => s.clearPreview);

  const onLiveChange = useCallback(
    (value: T) => {
      const previews: Record<string, Record<string, T>> = {};
      itemIds.forEach((id) => {
        previews[id] = { [property]: value };
      });
      setTransformPreview(previews);
    },
    [itemIds, property, setTransformPreview]
  );

  const onChange = useCallback(
    (value: T) => {
      onUpdate(value);
      queueMicrotask(() => clearPreview());
    },
    [onUpdate, clearPreview]
  );

  return [onLiveChange, onChange];
}

/**
 * Factory hook that creates multiple live property handlers.
 * Useful when you need several handlers with the same itemIds.
 *
 * @param itemIds - Array of item IDs to apply changes to
 * @returns A function to create property change handlers
 *
 * @example
 * ```tsx
 * const createHandler = useLivePropertyHandlers(itemIds);
 *
 * const [onFillLive, onFillCommit] = createHandler(
 *   'fillColor',
 *   (v) => updateItems({ fillColor: v })
 * );
 *
 * const [onStrokeLive, onStrokeCommit] = createHandler(
 *   'strokeColor',
 *   (v) => updateItems({ strokeColor: v })
 * );
 * ```
 */
export function useLivePropertyHandlers(itemIds: string[]) {
  const setPropertiesPreviewNew = useGizmoStore((s) => s.setPropertiesPreviewNew);
  const clearPreview = useGizmoStore((s) => s.clearPreview);

  return useCallback(
    <T>(
      property: string,
      onUpdate: (value: T) => void
    ): [(value: T) => void, (value: T) => void] => {
      const onLiveChange = (value: T) => {
        const previews: Record<string, Record<string, T>> = {};
        itemIds.forEach((id) => {
          previews[id] = { [property]: value };
        });
        setPropertiesPreviewNew(previews);
      };

      const onChange = (value: T) => {
        onUpdate(value);
        queueMicrotask(() => clearPreview());
      };

      return [onLiveChange, onChange];
    },
    [itemIds, setPropertiesPreviewNew, clearPreview]
  );
}
