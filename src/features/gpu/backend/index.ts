/**
 * GPU Render Backend
 *
 * Provides an abstraction layer for GPU rendering with automatic
 * fallback from WebGPU → WebGL2 → Canvas.
 */

// Types
export type {
  RenderBackend,
  BackendCapabilities,
  BackendName,
  BackendOptions,
  TextureHandle,
  TextureFormat,
  RenderPassDescriptor,
} from './types';

// Capability detection
export {
  detectWebGPUSupport,
  detectWebGL2Support,
  detectCanvasSupport,
  detectBestBackend,
  getAvailableBackends,
} from './capabilities';

// Backend implementations
export { WebGPUBackend } from './webgpu-backend';
export { WebGL2Backend } from './webgl2-backend';
export { CanvasBackend } from './canvas-backend';

// Factory
export { createBackend, getAvailableBackendNames } from './create-backend';
