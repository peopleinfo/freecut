/**
 * Native font utilities
 *
 * Replaces @remotion/google-fonts and @remotion/layout-utils with native implementations.
 */

export {
  loadFont,
  loadFontAsync,
  loadFonts,
  loadFontsAsync,
  isFontLoaded,
  getFontFamily,
  FONT_WEIGHT_MAP,
  AVAILABLE_FONTS,
} from './font-loader';

export { measureText, measureTextWidth, fitText } from './text-measurement';
