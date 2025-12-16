import type { TimelineItem } from '@/types/timeline';
import type { TransformProperties } from '@/types/transform';
import type { AnimatableProperty, ItemKeyframes, EasingType } from '@/types/keyframe';
import { shouldAutoKeyframe } from './auto-keyframe';

/**
 * Result of committing transform changes.
 */
export interface CommitResult {
  /** Properties that were auto-keyframed */
  keyframedProps: Set<AnimatableProperty>;
  /** Properties that need base transform update */
  baseProps: Partial<TransformProperties>;
  /** Whether any changes were made */
  hasChanges: boolean;
}

/**
 * Options for committing transform changes.
 */
export interface CommitOptions {
  /** Current playhead frame (absolute) */
  currentFrame: number;
  /** Keyframes for the item (if any) */
  itemKeyframes?: ItemKeyframes;
  /** Function to add a new keyframe */
  addKeyframe: (
    itemId: string,
    property: AnimatableProperty,
    frame: number,
    value: number,
    easing: EasingType
  ) => void;
  /** Function to update an existing keyframe */
  updateKeyframe: (
    itemId: string,
    property: AnimatableProperty,
    keyframeId: string,
    updates: { value?: number }
  ) => void;
}

/**
 * Transform property to AnimatableProperty mapping.
 * Only includes properties that can be animated.
 */
const ANIMATABLE_TRANSFORM_PROPS: (keyof TransformProperties & AnimatableProperty)[] = [
  'x', 'y', 'width', 'height', 'rotation', 'opacity', 'cornerRadius'
];

/**
 * Commit transform changes for a single item.
 * Handles auto-keyframing for properties that have keyframes,
 * and returns remaining properties for base transform update.
 *
 * This is the SINGLE ENTRY POINT for committing transform changes.
 * Use it from both gizmo interactions and properties panel.
 *
 * @example
 * // From gizmo
 * const result = commitTransformChanges(item, transform, options);
 * if (Object.keys(result.baseProps).length > 0) {
 *   updateItemTransform(item.id, result.baseProps);
 * }
 *
 * @example
 * // From properties panel (single property)
 * const result = commitTransformChanges(item, { x: newX }, options);
 */
export function commitTransformChanges(
  item: TimelineItem,
  changes: Partial<TransformProperties>,
  options: CommitOptions
): CommitResult {
  const { currentFrame, itemKeyframes, addKeyframe, updateKeyframe } = options;
  const relativeFrame = currentFrame - item.from;

  const keyframedProps = new Set<AnimatableProperty>();
  const baseProps: Partial<TransformProperties> = {};

  // Process each animatable property
  for (const prop of ANIMATABLE_TRANSFORM_PROPS) {
    const value = changes[prop];
    if (value === undefined) continue;

    // Check if this property should be auto-keyframed
    const result = shouldAutoKeyframe(
      itemKeyframes,
      prop,
      relativeFrame,
      item.durationInFrames
    );

    if (result.handled) {
      // Auto-keyframe this property
      if (result.action === 'update' && result.existingKeyframeId) {
        updateKeyframe(item.id, prop, result.existingKeyframeId, { value });
      } else if (result.action === 'add') {
        addKeyframe(item.id, prop, relativeFrame, value, 'linear');
      }
      keyframedProps.add(prop);
    } else {
      // Add to base transform update
      baseProps[prop] = value;
    }
  }

  // Handle non-animatable properties (aspectRatioLocked)
  if (changes.aspectRatioLocked !== undefined) {
    baseProps.aspectRatioLocked = changes.aspectRatioLocked;
  }

  return {
    keyframedProps,
    baseProps,
    hasChanges: keyframedProps.size > 0 || Object.keys(baseProps).length > 0,
  };
}

/**
 * Commit transform changes for multiple items.
 * Useful for gizmo group transforms.
 *
 * @returns Map of itemId to CommitResult
 */
export function commitTransformChangesForItems(
  items: TimelineItem[],
  changesMap: Map<string, Partial<TransformProperties>>,
  keyframesMap: Map<string, ItemKeyframes>,
  options: Omit<CommitOptions, 'itemKeyframes'>
): Map<string, CommitResult> {
  const results = new Map<string, CommitResult>();

  for (const item of items) {
    const changes = changesMap.get(item.id);
    if (!changes) continue;

    const result = commitTransformChanges(item, changes, {
      ...options,
      itemKeyframes: keyframesMap.get(item.id),
    });

    results.set(item.id, result);
  }

  return results;
}
