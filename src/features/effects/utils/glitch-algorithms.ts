import type { GlitchEffect } from '@/types/effects';

/**
 * Seeded random number generator for deterministic glitch patterns.
 * Essential for consistent rendering during video export.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * RGB Split effect styles.
 * Creates chromatic aberration by offsetting color channels.
 *
 * @param intensity - Effect intensity (0-1)
 * @param frame - Current frame number
 * @param speed - Animation speed multiplier
 * @param seed - Random seed for deterministic output
 * @returns Offset values for red and blue channels
 */
export function getRGBSplitStyles(
  intensity: number,
  frame: number,
  speed: number,
  seed: number
): {
  redOffset: number;
  blueOffset: number;
  active: boolean;
} {
  const random = seededRandom(Math.floor(frame * speed) + seed);
  const baseOffset = intensity * 15;
  const jitter = (random() - 0.5) * intensity * 10;

  // Smooth oscillation with random jitter
  const offset = Math.sin(frame * 0.3 * speed) * baseOffset + jitter;

  return {
    redOffset: offset,
    blueOffset: -offset,
    active: Math.abs(offset) > 0.5,
  };
}

/**
 * Scanlines effect styles.
 * Creates CRT-style horizontal lines overlay.
 *
 * @param intensity - Effect intensity (0-1)
 * @returns CSS properties for scanline overlay
 */
export function getScanlinesStyle(intensity: number): React.CSSProperties {
  return {
    background: `repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, ${intensity * 0.3}) 2px,
      rgba(0, 0, 0, ${intensity * 0.3}) 4px
    )`,
    pointerEvents: 'none',
    mixBlendMode: 'multiply',
  };
}

/**
 * Color glitch effect.
 * Returns hue rotation value for random color shifts.
 *
 * @param intensity - Effect intensity (0-1)
 * @param frame - Current frame number
 * @param speed - Animation speed multiplier
 * @param seed - Random seed for deterministic output
 * @returns Hue rotation in degrees (0 if no glitch this frame)
 */
export function getColorGlitch(
  intensity: number,
  frame: number,
  speed: number,
  seed: number
): number {
  const random = seededRandom(Math.floor(frame * speed) + seed);

  // Probability of glitch occurring increases with intensity
  const shouldGlitch = random() > 1 - intensity * 0.3;

  if (!shouldGlitch) return 0;

  return random() * 360 * intensity;
}

/**
 * Get combined glitch CSS filter string including color glitch.
 *
 * @param glitchEffects - Array of glitch effects to process
 * @param frame - Current frame number
 * @returns Additional CSS filter string for color-based glitch effects
 */
export function getGlitchFilterString(
  glitchEffects: Array<GlitchEffect & { id: string }>,
  frame: number
): string {
  const filters: string[] = [];

  for (const effect of glitchEffects) {
    if (effect.variant === 'color-glitch') {
      const hueShift = getColorGlitch(
        effect.intensity,
        frame,
        effect.speed,
        effect.seed
      );
      if (hueShift !== 0) {
        filters.push(`hue-rotate(${hueShift}deg)`);
      }
    }
  }

  return filters.join(' ');
}
