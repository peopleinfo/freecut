/**
 * Keyframe Actions - Animation keyframe operations with undo/redo support.
 */

import type { AnimatableProperty, EasingType, EasingConfig, KeyframeRef } from '@/types/keyframe';
import type { KeyframeUpdatePayload, KeyframeMovePayload, KeyframeAddPayload } from '../keyframes-store';
import { useKeyframesStore } from '../keyframes-store';
import { useTimelineSettingsStore } from '../timeline-settings-store';
import { execute, logger, canAddKeyframeAtFrame } from './shared';

export function addKeyframe(
  itemId: string,
  property: AnimatableProperty,
  frame: number,
  value: number,
  easing?: EasingType
): string {
  // Validate: keyframes cannot be added in transition regions
  if (!canAddKeyframeAtFrame(itemId, frame)) {
    logger.warn('Cannot add keyframe in transition region', { itemId, property, frame });
    return '';
  }

  return execute('ADD_KEYFRAME', () => {
    const id = useKeyframesStore.getState()._addKeyframe(itemId, property, frame, value, easing);
    useTimelineSettingsStore.getState().markDirty();
    return id;
  }, { itemId, property, frame });
}

/**
 * Add multiple keyframes at once (batched as single undo operation).
 * Used by K hotkey to add keyframes for all properties at once.
 * Keyframes in transition regions are filtered out.
 */
export function addKeyframes(payloads: KeyframeAddPayload[]): string[] {
  if (payloads.length === 0) return [];

  // Filter out keyframes that would be placed in transition regions
  const validPayloads = payloads.filter((p) => canAddKeyframeAtFrame(p.itemId, p.frame));

  if (validPayloads.length === 0) {
    logger.warn('All keyframes blocked by transition regions', { originalCount: payloads.length });
    return [];
  }

  if (validPayloads.length < payloads.length) {
    logger.warn('Some keyframes blocked by transition regions', {
      originalCount: payloads.length,
      validCount: validPayloads.length,
    });
  }

  return execute('ADD_KEYFRAMES', () => {
    const ids = useKeyframesStore.getState()._addKeyframes(validPayloads);
    useTimelineSettingsStore.getState().markDirty();
    return ids;
  }, { count: validPayloads.length });
}

export function updateKeyframe(
  itemId: string,
  property: AnimatableProperty,
  keyframeId: string,
  updates: Partial<{ frame: number; value: number; easing: EasingType }>
): void {
  execute('UPDATE_KEYFRAME', () => {
    useKeyframesStore.getState()._updateKeyframe(itemId, property, keyframeId, updates);
    useTimelineSettingsStore.getState().markDirty();
  }, { itemId, property, keyframeId });
}

export function removeKeyframe(
  itemId: string,
  property: AnimatableProperty,
  keyframeId: string
): void {
  execute('REMOVE_KEYFRAME', () => {
    useKeyframesStore.getState()._removeKeyframe(itemId, property, keyframeId);
    useTimelineSettingsStore.getState().markDirty();
  }, { itemId, property, keyframeId });
}

export function removeKeyframesForItem(itemId: string): void {
  execute('REMOVE_KEYFRAMES_FOR_ITEM', () => {
    useKeyframesStore.getState()._removeKeyframesForItem(itemId);
    useTimelineSettingsStore.getState().markDirty();
  }, { itemId });
}

export function removeKeyframesForProperty(itemId: string, property: AnimatableProperty): void {
  execute('REMOVE_KEYFRAMES_FOR_PROPERTY', () => {
    useKeyframesStore.getState()._removeKeyframesForProperty(itemId, property);
    useTimelineSettingsStore.getState().markDirty();
  }, { itemId, property });
}

// Read-only keyframe helpers (no undo needed)
export function getKeyframesForItem(itemId: string) {
  return useKeyframesStore.getState().getKeyframesForItem(itemId);
}

export function hasKeyframesAtFrame(
  itemId: string,
  property: AnimatableProperty,
  frame: number
): boolean {
  return useKeyframesStore.getState().hasKeyframesAtFrame(itemId, property, frame);
}

/**
 * Move multiple keyframes to new frame positions.
 * Moves into transition regions are filtered out.
 */
export function moveKeyframes(moves: KeyframeMovePayload[]): void {
  if (moves.length === 0) return;

  // Filter out moves that would place keyframes in transition regions
  const validMoves = moves.filter((m) => canAddKeyframeAtFrame(m.ref.itemId, m.newFrame));

  if (validMoves.length === 0) {
    logger.warn('All keyframe moves blocked by transition regions', { originalCount: moves.length });
    return;
  }

  if (validMoves.length < moves.length) {
    logger.warn('Some keyframe moves blocked by transition regions', {
      originalCount: moves.length,
      validCount: validMoves.length,
    });
  }

  execute('MOVE_KEYFRAMES', () => {
    useKeyframesStore.getState()._moveKeyframes(validMoves);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: validMoves.length });
}

/**
 * Update multiple keyframes at once.
 */
export function updateKeyframes(updates: KeyframeUpdatePayload[]): void {
  if (updates.length === 0) return;

  execute('UPDATE_KEYFRAMES', () => {
    useKeyframesStore.getState()._updateKeyframes(updates);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: updates.length });
}

/**
 * Remove multiple keyframes at once.
 */
export function removeKeyframes(refs: KeyframeRef[]): void {
  if (refs.length === 0) return;

  execute('REMOVE_KEYFRAMES', () => {
    useKeyframesStore.getState()._removeKeyframes(refs);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: refs.length });
}

/**
 * Duplicate keyframes with an optional frame offset.
 * Returns the IDs of the new keyframes.
 */
export function duplicateKeyframes(
  refs: KeyframeRef[],
  frameOffset: number = 0,
  targetItemId?: string,
  targetProperty?: AnimatableProperty
): string[] {
  if (refs.length === 0) return [];

  return execute('DUPLICATE_KEYFRAMES', () => {
    const ids = useKeyframesStore.getState()._duplicateKeyframes(
      refs,
      frameOffset,
      targetItemId,
      targetProperty
    );
    useTimelineSettingsStore.getState().markDirty();
    return ids;
  }, { count: refs.length, frameOffset }) as string[];
}

/**
 * Set the same easing for multiple keyframes.
 */
export function batchSetEasing(
  refs: KeyframeRef[],
  easing: EasingType,
  easingConfig?: EasingConfig
): void {
  if (refs.length === 0) return;

  const updates: KeyframeUpdatePayload[] = refs.map((ref) => ({
    itemId: ref.itemId,
    property: ref.property,
    keyframeId: ref.keyframeId,
    updates: { easing, easingConfig },
  }));

  execute('BATCH_SET_EASING', () => {
    useKeyframesStore.getState()._updateKeyframes(updates);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: refs.length, easing });
}

/**
 * Offset values for multiple keyframes.
 * Mode 'add' adds the offset, 'multiply' multiplies by the factor.
 */
export function batchOffsetValues(
  refs: KeyframeRef[],
  offset: number,
  mode: 'add' | 'multiply' = 'add'
): void {
  if (refs.length === 0) return;

  execute('BATCH_OFFSET_VALUES', () => {
    const store = useKeyframesStore.getState();
    const updates: KeyframeUpdatePayload[] = [];

    for (const ref of refs) {
      const kf = store.getKeyframeById(ref.itemId, ref.property, ref.keyframeId);
      if (!kf) continue;

      const newValue = mode === 'add' ? kf.value + offset : kf.value * offset;
      updates.push({
        itemId: ref.itemId,
        property: ref.property,
        keyframeId: ref.keyframeId,
        updates: { value: newValue },
      });
    }

    store._updateKeyframes(updates);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: refs.length, offset, mode });
}

/**
 * Reverse the frame order of selected keyframes within their property.
 * Keyframes are redistributed to maintain the same frame positions but with reversed values.
 */
export function reverseKeyframes(refs: KeyframeRef[]): void {
  if (refs.length < 2) return;

  execute('REVERSE_KEYFRAMES', () => {
    const store = useKeyframesStore.getState();

    // Group refs by item+property
    const groups = new Map<string, KeyframeRef[]>();
    for (const ref of refs) {
      const key = `${ref.itemId}:${ref.property}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ref);
    }

    const updates: KeyframeUpdatePayload[] = [];

    // Reverse each group
    for (const groupRefs of groups.values()) {
      if (groupRefs.length < 2) continue;

      // Get keyframe data and sort by frame
      const keyframes = groupRefs
        .map((ref) => ({
          ref,
          kf: store.getKeyframeById(ref.itemId, ref.property, ref.keyframeId),
        }))
        .filter((x) => x.kf !== undefined)
        .sort((a, b) => a.kf!.frame - b.kf!.frame);

      // Reverse the values (keep frame positions, swap values)
      const values = keyframes.map((x) => x.kf!.value).reverse();

      for (let i = 0; i < keyframes.length; i++) {
        const kfData = keyframes[i];
        const newValue = values[i];
        if (kfData && newValue !== undefined) {
          updates.push({
            itemId: kfData.ref.itemId,
            property: kfData.ref.property,
            keyframeId: kfData.ref.keyframeId,
            updates: { value: newValue },
          });
        }
      }
    }

    store._updateKeyframes(updates);
    useTimelineSettingsStore.getState().markDirty();
  }, { count: refs.length });
}

/**
 * Scale/stretch keyframe positions proportionally.
 * @param refs Keyframes to scale
 * @param scaleFactor Factor to multiply frame positions by (1.0 = no change)
 */
export function stretchKeyframes(refs: KeyframeRef[], scaleFactor: number): void {
  if (refs.length < 2 || scaleFactor === 1) return;

  execute('STRETCH_KEYFRAMES', () => {
    const store = useKeyframesStore.getState();

    // Group refs by item+property
    const groups = new Map<string, KeyframeRef[]>();
    for (const ref of refs) {
      const key = `${ref.itemId}:${ref.property}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ref);
    }

    const moves: KeyframeMovePayload[] = [];

    // Scale each group
    for (const groupRefs of groups.values()) {
      if (groupRefs.length < 2) continue;

      // Get keyframe data and find min frame
      const keyframes = groupRefs
        .map((ref) => ({
          ref,
          frame: store.getKeyframeById(ref.itemId, ref.property, ref.keyframeId)?.frame ?? 0,
        }));

      const minFrame = Math.min(...keyframes.map((x) => x.frame));

      // Scale relative to minimum frame
      for (const kf of keyframes) {
        const relativeFrame = kf.frame - minFrame;
        const scaledRelative = Math.round(relativeFrame * scaleFactor);
        const newFrame = minFrame + scaledRelative;

        if (newFrame !== kf.frame) {
          moves.push({ ref: kf.ref, newFrame });
        }
      }
    }

    if (moves.length > 0) {
      store._moveKeyframes(moves);
    }
    useTimelineSettingsStore.getState().markDirty();
  }, { count: refs.length, scaleFactor });
}
