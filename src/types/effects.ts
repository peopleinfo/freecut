// CSS filter types that work in both browser preview and Remotion export
export type CSSFilterType =
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'blur'
  | 'hue-rotate'
  | 'grayscale'
  | 'sepia'
  | 'invert';

// Glitch effect variants (implemented via CSS transforms and layers)
export type GlitchVariant = 'rgb-split' | 'scanlines' | 'color-glitch';

// CSS filter effect configuration
export interface CSSFilterEffect {
  type: 'css-filter';
  filter: CSSFilterType;
  value: number;
}

// Glitch effect configuration
export interface GlitchEffect {
  type: 'glitch';
  variant: GlitchVariant;
  intensity: number; // 0-1 normalized intensity
  speed: number; // Animation speed multiplier (0.5-2)
  seed: number; // Random seed for deterministic rendering during export
}

// Union of all visual effects
export type VisualEffect = CSSFilterEffect | GlitchEffect;

// Effect instance applied to a timeline item
export interface ItemEffect {
  id: string;
  effect: VisualEffect;
  enabled: boolean;
}

// Filter configuration metadata for UI
export interface FilterConfig {
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
}

// Default configurations for CSS filters
export const CSS_FILTER_CONFIGS: Record<CSSFilterType, FilterConfig> = {
  brightness: { label: 'Brightness', min: 0, max: 200, default: 100, step: 1, unit: '%' },
  contrast: { label: 'Contrast', min: 0, max: 200, default: 100, step: 1, unit: '%' },
  saturate: { label: 'Saturation', min: 0, max: 200, default: 100, step: 1, unit: '%' },
  blur: { label: 'Blur', min: 0, max: 50, default: 0, step: 0.5, unit: 'px' },
  'hue-rotate': { label: 'Hue Rotate', min: 0, max: 360, default: 0, step: 1, unit: '°' },
  grayscale: { label: 'Grayscale', min: 0, max: 100, default: 0, step: 1, unit: '%' },
  sepia: { label: 'Sepia', min: 0, max: 100, default: 0, step: 1, unit: '%' },
  invert: { label: 'Invert', min: 0, max: 100, default: 0, step: 1, unit: '%' },
};

// Glitch effect configuration metadata
export const GLITCH_CONFIGS: Record<GlitchVariant, { label: string; description: string }> = {
  'rgb-split': { label: 'RGB Split', description: 'Chromatic aberration effect' },
  scanlines: { label: 'Scanlines', description: 'CRT monitor scanline overlay' },
  'color-glitch': { label: 'Color Glitch', description: 'Random hue shifts' },
};

// Effect presets (combinations of multiple effects)
export interface EffectPreset {
  id: string;
  name: string;
  effects: VisualEffect[];
}

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'vintage',
    name: 'Vintage',
    effects: [
      { type: 'css-filter', filter: 'sepia', value: 40 },
      { type: 'css-filter', filter: 'contrast', value: 110 },
      { type: 'css-filter', filter: 'brightness', value: 90 },
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    effects: [
      { type: 'css-filter', filter: 'grayscale', value: 100 },
      { type: 'css-filter', filter: 'contrast', value: 130 },
    ],
  },
  {
    id: 'cold',
    name: 'Cold',
    effects: [
      { type: 'css-filter', filter: 'hue-rotate', value: 180 },
      { type: 'css-filter', filter: 'saturate', value: 80 },
    ],
  },
  {
    id: 'warm',
    name: 'Warm',
    effects: [
      { type: 'css-filter', filter: 'sepia', value: 20 },
      { type: 'css-filter', filter: 'saturate', value: 120 },
    ],
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    effects: [
      { type: 'css-filter', filter: 'contrast', value: 150 },
      { type: 'css-filter', filter: 'saturate', value: 130 },
    ],
  },
  {
    id: 'faded',
    name: 'Faded',
    effects: [
      { type: 'css-filter', filter: 'contrast', value: 80 },
      { type: 'css-filter', filter: 'brightness', value: 110 },
      { type: 'css-filter', filter: 'saturate', value: 70 },
    ],
  },
];
