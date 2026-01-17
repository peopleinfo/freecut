/**
 * Native shape utilities
 *
 * Replaces @remotion/shapes and @remotion/paths with native implementations.
 */

// Shape path generators
export {
  makeRect,
  makeCircle,
  makeEllipse,
  makeTriangle,
  makeStar,
  makePolygon,
  makeHeart,
  type ShapeResult,
} from './shape-generators';

// Path transformation utilities
export { scalePath, translatePath } from './path-utils';

// Shape React components
export { Rect, Circle, Ellipse, Triangle, Star, Polygon, Heart } from './components';
