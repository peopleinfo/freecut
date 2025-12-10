/**
 * Utility for computing mixed values across multi-selection.
 * Used in property panels when multiple items are selected.
 */

export type MixedValue<T> = T | 'mixed';

/**
 * Tolerance for comparing numeric values.
 * Values within this tolerance are considered equal.
 */
const NUMERIC_TOLERANCE = 0.01;

/**
 * Get a mixed value from an array of items.
 * Returns 'mixed' if values differ across items, otherwise returns the common value.
 *
 * @param items - Array of items to extract values from
 * @param getter - Function to extract the value from each item
 * @param defaultValue - Default value when property is undefined
 * @returns The common value or 'mixed' if values differ
 *
 * @example
 * ```ts
 * const volume = getMixedValue(
 *   audioItems,
 *   (item) => item.volume,
 *   0
 * );
 * // Returns number if all items have same volume, 'mixed' otherwise
 * ```
 */
export function getMixedValue<TItem, TValue>(
  items: TItem[],
  getter: (item: TItem) => TValue | undefined,
  defaultValue: TValue
): MixedValue<TValue> {
  if (items.length === 0) return defaultValue;

  const values = items.map((item) => getter(item) ?? defaultValue);
  const firstValue = values[0]!;

  const areEqual = values.every((v) => {
    // For numbers, use tolerance-based comparison
    if (typeof v === 'number' && typeof firstValue === 'number') {
      return Math.abs(v - firstValue) < NUMERIC_TOLERANCE;
    }
    // For other types, use strict equality
    return v === firstValue;
  });

  return areEqual ? firstValue : 'mixed';
}

/**
 * Check if a value is mixed.
 * Type guard for narrowing MixedValue<T> to T.
 */
export function isMixed<T>(value: MixedValue<T>): value is 'mixed' {
  return value === 'mixed';
}

/**
 * Get the actual value from a MixedValue, using default if mixed.
 */
export function getValueOrDefault<T>(value: MixedValue<T>, defaultValue: T): T {
  return isMixed(value) ? defaultValue : value;
}

/**
 * Compute multiple mixed values in a single pass for efficiency.
 *
 * @param items - Array of items to extract values from
 * @param config - Object mapping keys to getter/default pairs
 * @returns Object with same keys, values are MixedValue<T>
 *
 * @example
 * ```ts
 * const values = getMixedValues(shapeItems, {
 *   fillColor: { get: (i) => i.fillColor, default: '#3b82f6' },
 *   strokeWidth: { get: (i) => i.strokeWidth, default: 0 },
 * });
 * // values.fillColor: string | 'mixed'
 * // values.strokeWidth: number | 'mixed'
 * ```
 */
export function getMixedValues<
  TItem,
  TConfig extends Record<string, { get: (item: TItem) => unknown; default: unknown }>
>(
  items: TItem[],
  config: TConfig
): {
  [K in keyof TConfig]: MixedValue<
    TConfig[K]['default'] extends infer D ? D : never
  >;
} {
  const result = {} as Record<string, unknown>;

  for (const key in config) {
    const entry = config[key]!;
    result[key] = getMixedValue(items, entry.get as (item: TItem) => unknown, entry.default);
  }

  return result as {
    [K in keyof TConfig]: MixedValue<
      TConfig[K]['default'] extends infer D ? D : never
    >;
  };
}
