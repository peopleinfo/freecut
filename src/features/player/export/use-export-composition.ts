/**
 * use-export-composition.ts - Hook to extract composition data for export
 *
 * This hook bridges the player's Clock system with the export pipeline,
 * providing composition data in the format expected by the renderer.
 */

import { useMemo, useCallback } from 'react';
import type { CompositionData, NativeExportSettings, ExportProgress, ExportResult } from './types';
import { getDefaultExportSettings, QUALITY_BITRATES, getMimeTypeForContainer } from './types';
import type { TimelineTrack } from '@/types/timeline';
import type { Transition } from '@/types/transition';
import type { ItemKeyframes } from '@/types/keyframe';

/**
 * Options for the useExportComposition hook
 */
export interface UseExportCompositionOptions {
  /** Timeline tracks */
  tracks: TimelineTrack[];
  /** Transitions between clips */
  transitions?: Transition[];
  /** Keyframe animations */
  keyframes?: ItemKeyframes[];
  /** Frames per second */
  fps: number;
  /** Total duration in frames */
  durationInFrames: number;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Background color */
  backgroundColor?: string;
}

/**
 * Return type for the useExportComposition hook
 */
export interface UseExportCompositionReturn {
  /** Composition data ready for export */
  composition: CompositionData;
  /** Default export settings based on composition */
  defaultSettings: NativeExportSettings;
  /** Start an export with the given settings */
  startExport: (
    settings: NativeExportSettings,
    onProgress?: (progress: ExportProgress) => void,
    signal?: AbortSignal
  ) => Promise<ExportResult>;
  /** Check if a codec is supported in the browser */
  isCodecSupported: (codec: string) => Promise<boolean>;
}

/**
 * Check if VideoEncoder API is available
 */
function isWebCodecsSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
}

/**
 * Check if a specific video codec is supported
 */
async function checkVideoCodecSupport(
  codec: string,
  width: number,
  height: number
): Promise<boolean> {
  if (!isWebCodecsSupported()) return false;

  const codecStrings: Record<string, string> = {
    avc: 'avc1.42E01E', // H.264 Baseline
    hevc: 'hvc1.1.6.L93.B0', // HEVC Main
    vp8: 'vp8',
    vp9: 'vp09.00.10.08',
    av1: 'av01.0.04M.08',
  };

  const codecString = codecStrings[codec];
  if (!codecString) return false;

  try {
    const support = await VideoEncoder.isConfigSupported({
      codec: codecString,
      width,
      height,
      bitrate: 5_000_000,
    });
    return support.supported ?? false;
  } catch {
    return false;
  }
}

/**
 * Hook to extract composition data for export
 *
 * This hook provides composition data and export utilities that work
 * with the existing client-render-engine.
 *
 * @example
 * ```tsx
 * const { composition, startExport } = useExportComposition({
 *   tracks,
 *   fps: 30,
 *   durationInFrames: 900,
 *   width: 1920,
 *   height: 1080,
 * });
 *
 * const handleExport = async () => {
 *   const result = await startExport(settings, (progress) => {
 *     console.log(`Export progress: ${progress.progress}%`);
 *   });
 *   if (result.success && result.url) {
 *     window.open(result.url);
 *   }
 * };
 * ```
 */
export function useExportComposition(
  options: UseExportCompositionOptions
): UseExportCompositionReturn {
  const {
    tracks,
    transitions = [],
    keyframes = [],
    fps,
    durationInFrames,
    width,
    height,
    backgroundColor = '#000000',
  } = options;

  // Memoize composition data
  const composition = useMemo<CompositionData>(
    () => ({
      fps,
      durationInFrames,
      width,
      height,
      tracks,
      transitions,
      keyframes,
      backgroundColor,
    }),
    [fps, durationInFrames, width, height, tracks, transitions, keyframes, backgroundColor]
  );

  // Get default settings based on composition
  const defaultSettings = useMemo(
    () => getDefaultExportSettings(composition),
    [composition]
  );

  // Check codec support
  const isCodecSupported = useCallback(
    async (codec: string): Promise<boolean> => {
      return checkVideoCodecSupport(codec, width, height);
    },
    [width, height]
  );

  // Start export function
  const startExport = useCallback(
    async (
      settings: NativeExportSettings,
      onProgress?: (progress: ExportProgress) => void,
      signal?: AbortSignal
    ): Promise<ExportResult> => {
      const startTime = performance.now();

      // Report initial progress
      onProgress?.({
        phase: 'preparing',
        progress: 0,
        message: 'Preparing export...',
      });

      try {
        // Check WebCodecs support
        if (!isWebCodecsSupported()) {
          throw new Error('WebCodecs API is not supported in this browser');
        }

        // Check codec support
        const codecSupported = await checkVideoCodecSupport(
          settings.videoCodec,
          settings.resolution.width,
          settings.resolution.height
        );

        if (!codecSupported) {
          throw new Error(`Video codec "${settings.videoCodec}" is not supported`);
        }

        // Dynamically import the render engine
        const { renderComposition } = await import('@/features/export/utils/client-render-engine');

        // Get bitrates from quality preset or custom settings
        const bitrates = QUALITY_BITRATES[settings.quality];
        const videoBitrate = settings.videoBitrate ?? bitrates.video;
        const audioBitrate = settings.audioBitrate ?? bitrates.audio;

        // Map our settings to client-render-engine format
        const clientSettings = {
          mode: 'video' as const,
          codec: settings.videoCodec,
          container: settings.container,
          quality: settings.quality,
          resolution: {
            width: settings.resolution.width,
            height: settings.resolution.height,
          },
          videoBitrate,
          audioBitrate,
          fps: composition.fps,
        };

        // Calculate actual frames to render
        const inPoint = settings.inPoint ?? 0;
        const outPoint = settings.outPoint ?? composition.durationInFrames;
        const framesToRender = outPoint - inPoint;

        // Create a modified composition with in/out points if specified
        const exportComposition = {
          ...composition,
          durationInFrames: framesToRender,
          // Offset tracks if in point is not 0
          tracks: inPoint > 0
            ? composition.tracks.map((track) => ({
                ...track,
                items: track.items.map((item) => ({
                  ...item,
                  from: item.from - inPoint,
                })),
              }))
            : composition.tracks,
        };

        // Start the render
        const result = await renderComposition({
          settings: clientSettings,
          composition: exportComposition,
          onProgress: (progress) => {
            onProgress?.({
              phase: progress.phase as ExportProgress['phase'],
              progress: progress.progress,
              currentFrame: progress.currentFrame,
              totalFrames: progress.totalFrames,
              message: progress.message ?? `${progress.phase}...`,
            });
          },
          signal,
        });

        const exportDuration = performance.now() - startTime;

        // renderComposition returns ClientRenderResult directly (throws on error)
        const url = URL.createObjectURL(result.blob);

        onProgress?.({
          phase: 'complete',
          progress: 100,
          message: 'Export complete!',
        });

        return {
          success: true,
          blob: result.blob,
          url,
          mimeType: getMimeTypeForContainer(settings.container),
          exportDuration,
          fileSize: result.fileSize,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        onProgress?.({
          phase: 'error',
          progress: 0,
          message: `Export failed: ${message}`,
        });

        return {
          success: false,
          error: message,
          exportDuration: performance.now() - startTime,
        };
      }
    },
    [composition]
  );

  return {
    composition,
    defaultSettings,
    startExport,
    isCodecSupported,
  };
}

/**
 * Utility: Download an export result
 */
export function downloadExportResult(
  result: ExportResult,
  filename: string = 'export'
): void {
  if (!result.success || !result.url) {
    throw new Error('Cannot download failed export');
  }

  const link = document.createElement('a');
  link.href = result.url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Utility: Revoke an export result URL
 *
 * Call this when you're done with the export result to free memory.
 */
export function revokeExportResult(result: ExportResult): void {
  if (result.url) {
    URL.revokeObjectURL(result.url);
  }
}

/**
 * Utility: Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Utility: Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}
