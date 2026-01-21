import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebGPU API for testing
const mockGPUAdapter = {
  requestDevice: vi.fn().mockResolvedValue({
    createShaderModule: vi.fn(),
    createBindGroupLayout: vi.fn(),
    createPipelineLayout: vi.fn(),
    createRenderPipeline: vi.fn(),
    createBuffer: vi.fn(),
    createTexture: vi.fn(),
    createSampler: vi.fn(),
    createCommandEncoder: vi.fn(),
    queue: {
      submit: vi.fn(),
      writeBuffer: vi.fn(),
      copyExternalImageToTexture: vi.fn(),
    },
    destroy: vi.fn(),
    limits: { maxTextureDimension2D: 8192 },
  }),
  features: new Set(),
  limits: {},
};

Object.defineProperty(navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn().mockResolvedValue(mockGPUAdapter),
    getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm'),
  },
  writable: true,
});
