/**
 * Built-in Transition Presets
 *
 * 40+ curated presets combining transitions with timing/duration/direction configs.
 * Each preset is a ready-to-apply configuration.
 */

import type { TransitionPreset } from '@/types/transition';

export const BUILTIN_PRESETS: TransitionPreset[] = [
  // ===== Basic =====
  {
    id: 'preset-smooth-crossfade',
    name: 'Smooth Crossfade',
    category: 'basic',
    config: { presentation: 'fade', timing: 'ease-in-out', durationInFrames: 30 },
    builtIn: true,
    tags: ['smooth', 'fade', 'gentle'],
  },
  {
    id: 'preset-quick-cut',
    name: 'Quick Cut',
    category: 'basic',
    config: { presentation: 'none', timing: 'linear', durationInFrames: 1 },
    builtIn: true,
    tags: ['quick', 'cut', 'instant'],
  },
  {
    id: 'preset-long-fade',
    name: 'Long Fade',
    category: 'basic',
    config: { presentation: 'fade', timing: 'linear', durationInFrames: 60 },
    builtIn: true,
    tags: ['long', 'fade', 'slow'],
  },
  {
    id: 'preset-fast-fade',
    name: 'Fast Fade',
    category: 'basic',
    config: { presentation: 'fade', timing: 'ease-in', durationInFrames: 10 },
    builtIn: true,
    tags: ['fast', 'fade', 'quick'],
  },

  // ===== Wipe =====
  {
    id: 'preset-wipe-left',
    name: 'Wipe Left',
    category: 'wipe',
    config: { presentation: 'wipe', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-left' },
    builtIn: true,
    tags: ['wipe', 'left', 'horizontal'],
  },
  {
    id: 'preset-wipe-right',
    name: 'Wipe Right',
    category: 'wipe',
    config: { presentation: 'wipe', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-right' },
    builtIn: true,
    tags: ['wipe', 'right', 'horizontal'],
  },
  {
    id: 'preset-wipe-down',
    name: 'Wipe Down',
    category: 'wipe',
    config: { presentation: 'wipe', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-top' },
    builtIn: true,
    tags: ['wipe', 'down', 'vertical'],
  },
  {
    id: 'preset-wipe-up',
    name: 'Wipe Up',
    category: 'wipe',
    config: { presentation: 'wipe', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-bottom' },
    builtIn: true,
    tags: ['wipe', 'up', 'vertical'],
  },

  // ===== Slide =====
  {
    id: 'preset-slide-left',
    name: 'Slide Left',
    category: 'slide',
    config: { presentation: 'slide', timing: 'ease-in-out', durationInFrames: 25, direction: 'from-left' },
    builtIn: true,
    tags: ['slide', 'left'],
  },
  {
    id: 'preset-slide-right',
    name: 'Slide Right',
    category: 'slide',
    config: { presentation: 'slide', timing: 'ease-in-out', durationInFrames: 25, direction: 'from-right' },
    builtIn: true,
    tags: ['slide', 'right'],
  },

  // ===== Flip =====
  {
    id: 'preset-flip-horizontal',
    name: 'Flip Horizontal',
    category: 'flip',
    config: { presentation: 'flip', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-left' },
    builtIn: true,
    tags: ['flip', 'horizontal', '3d'],
  },
  {
    id: 'preset-flip-vertical',
    name: 'Flip Vertical',
    category: 'flip',
    config: { presentation: 'flip', timing: 'ease-in-out', durationInFrames: 30, direction: 'from-top' },
    builtIn: true,
    tags: ['flip', 'vertical', '3d'],
  },

  // ===== Mask =====
  {
    id: 'preset-clock-wipe',
    name: 'Clock Wipe',
    category: 'mask',
    config: { presentation: 'clockWipe', timing: 'linear', durationInFrames: 30 },
    builtIn: true,
    tags: ['clock', 'wipe', 'radial'],
  },
  {
    id: 'preset-iris',
    name: 'Iris',
    category: 'mask',
    config: { presentation: 'iris', timing: 'ease-out', durationInFrames: 25 },
    builtIn: true,
    tags: ['iris', 'circle', 'reveal'],
  },

  // ===== Cinematic Combos =====
  {
    id: 'preset-cinematic-fade',
    name: 'Cinematic Fade',
    category: 'basic',
    config: {
      presentation: 'fade',
      timing: 'cubic-bezier',
      durationInFrames: 45,
      bezierPoints: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1.0 },
    },
    builtIn: true,
    tags: ['cinematic', 'film', 'fade', 'bezier'],
  },
  {
    id: 'preset-dramatic-wipe',
    name: 'Dramatic Wipe',
    category: 'wipe',
    config: {
      presentation: 'wipe',
      timing: 'cubic-bezier',
      durationInFrames: 40,
      direction: 'from-left',
      bezierPoints: { x1: 0.7, y1: 0.0, x2: 0.3, y2: 1.0 },
    },
    builtIn: true,
    tags: ['dramatic', 'wipe', 'slow', 'bezier'],
  },
  {
    id: 'preset-bounce-slide',
    name: 'Bounce Slide',
    category: 'slide',
    config: {
      presentation: 'slide',
      timing: 'spring',
      durationInFrames: 30,
      direction: 'from-right',
    },
    builtIn: true,
    tags: ['bounce', 'slide', 'spring', 'playful'],
  },
  {
    id: 'preset-asymmetric-fade',
    name: 'Asymmetric Fade',
    category: 'basic',
    config: {
      presentation: 'fade',
      timing: 'ease-in-out',
      durationInFrames: 30,
      alignment: 0.25,
    },
    builtIn: true,
    tags: ['asymmetric', 'fade', 'offset'],
  },
];

/**
 * Get all built-in presets.
 */
export function getBuiltinPresets(): TransitionPreset[] {
  return BUILTIN_PRESETS;
}
