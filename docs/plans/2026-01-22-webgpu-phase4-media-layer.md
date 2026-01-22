# WebGPU Phase 4: Media Layer (FFmpeg.wasm) Implementation Plan

**Goal:** Build the hybrid media decoding system with WebCodecs fast path and FFmpeg.wasm fallback for universal codec support.

**Deliverable:** Play any video format with efficient frame caching and preloading.

---

## Prerequisites

- Phase 1 complete (RenderBackend abstraction)
- Phase 2 complete (Shader Graph Core)
- Phase 3 complete (Render Graph + Compositing)
- All tests pass (`npm run test:run`)

---

## Task 1: Codec Support Detection

**Files:**
- Create: `src/features/gpu/media/codec-support.ts`
- Create: `src/features/gpu/media/codec-support.test.ts`

Implement codec detection that:
- Detects WebCodecs support for common codecs (H.264, VP8, VP9, AV1)
- Identifies codecs requiring FFmpeg.wasm (ProRes, DNxHD, etc.)
- Provides unified codec capability API
- Handles browser variations

---

## Task 2: Media Source Types and Interfaces

**Files:**
- Create: `src/features/gpu/media/types.ts`
- Create: `src/features/gpu/media/types.test.ts`

Define core media types:
- MediaSource interface
- DecodedFrame interface (unified output)
- MediaDecoder interface
- ProbeResult for format detection
- Codec routing types

---

## Task 3: WebCodecs Decoder (Fast Path)

**Files:**
- Create: `src/features/gpu/media/webcodecs-decoder.ts`
- Create: `src/features/gpu/media/webcodecs-decoder.test.ts`

Implement WebCodecs decoder:
- VideoDecoder setup and configuration
- Frame decoding with VideoFrame output
- Seek support with keyframe handling
- Error handling and recovery
- Hardware acceleration detection

---

## Task 4: FFmpeg.wasm Decoder (Fallback)

**Files:**
- Create: `src/features/gpu/media/ffmpeg-decoder.ts`
- Create: `src/features/gpu/media/ffmpeg-decoder.test.ts`

Implement FFmpeg.wasm decoder:
- Lazy loading of FFmpeg.wasm (~25MB)
- Decode to raw pixel data
- Support exotic codecs (ProRes, DNxHD, HEVC)
- Memory-efficient buffer management
- Progress reporting during load

---

## Task 5: Frame Cache with LRU Eviction

**Files:**
- Create: `src/features/gpu/media/frame-cache.ts`
- Create: `src/features/gpu/media/frame-cache.test.ts`

Implement frame caching:
- LRU eviction policy
- Configurable memory limit
- Frame keying by source + frame number
- Cache statistics (hits, misses, evictions)
- GPU texture integration

---

## Task 6: Media Source Manager

**Files:**
- Create: `src/features/gpu/media/media-source-manager.ts`
- Create: `src/features/gpu/media/media-source-manager.test.ts`

Build the orchestrating manager:
- Format probing
- Codec routing (WebCodecs vs FFmpeg)
- Decoder lifecycle management
- Frame request coordination
- Source open/close handling

---

## Task 7: Preloading and Prefetch

**Files:**
- Create: `src/features/gpu/media/prefetch-manager.ts`
- Create: `src/features/gpu/media/prefetch-manager.test.ts`

Implement preloading:
- Ahead-of-playhead prefetching
- Background decode scheduling
- Priority queue for visible frames
- Bandwidth-aware prefetch limits
- Cancel support for seek

---

## Task 8: GPU Texture Import

**Files:**
- Create: `src/features/gpu/media/texture-importer.ts`
- Create: `src/features/gpu/media/texture-importer.test.ts`

Connect decoded frames to GPU:
- VideoFrame → GPU texture (zero-copy when possible)
- Raw pixels → GPU texture upload
- Format conversion (YUV → RGB if needed)
- Texture pooling integration

---

## Task 9: Integration Tests

**Files:**
- Create: `src/features/gpu/media/media-integration.test.ts`

Full pipeline tests:
- Open source → decode → cache → GPU
- Codec routing verification
- Seek behavior
- Cache efficiency
- Error handling paths

---

## Task 10: Documentation and Module Export

**Files:**
- Create: `src/features/gpu/media/index.ts`
- Update: `src/features/gpu/index.ts`

---

## Phase 4 Complete Checklist

- [ ] Codec support detection
- [ ] Media source types
- [ ] WebCodecs decoder (fast path)
- [ ] FFmpeg.wasm decoder (fallback)
- [ ] Frame cache with LRU
- [ ] Media source manager
- [ ] Preloading/prefetch
- [ ] GPU texture import
- [ ] Integration tests
- [ ] Documentation
