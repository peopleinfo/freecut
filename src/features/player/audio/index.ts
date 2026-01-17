/**
 * Audio System - Multi-track audio management
 *
 * This module provides components for managing multiple audio
 * elements in a multi-track timeline:
 *
 * - AudioElement: Individual audio with Web Audio API
 * - AudioTrackManager: Orchestrates multiple audio elements
 * - useAudioContext: Shared AudioContext management
 *
 * Example usage:
 *
 * ```tsx
 * <AudioTrackManager
 *   items={audioItems}
 *   currentFrame={frame}
 *   fps={30}
 *   isPlaying={playing}
 *   masterVolume={0.8}
 * />
 * ```
 */

// Types
export type {
  AudioItemData,
  AudioElementState,
  AudioNodes,
  AudioElementProps,
  AudioTrackManagerProps,
  AudioTrackState,
  AudioFadeConfig,
  CalculateFadeMultiplier,
} from './types';

// Type utilities
export {
  dbToLinear,
  linearToDb,
  calculateLinearFade,
  calculateEqualPowerFade,
} from './types';

// AudioContext management
export {
  AudioContextProvider,
  useSharedAudioContext,
  useAutoResumeAudioContext,
  useAudioSampleRate,
  useGainNode,
  getAudioContext,
  resumeAudioContext,
  type SharedAudioContextValue,
  type AudioContextState,
} from './use-audio-context';

// AudioElement component
export {
  AudioElement,
  type AudioElementHandle,
} from './AudioElement';

// AudioTrackManager component
export {
  AudioTrackManager,
  useAudioTrackState,
} from './AudioTrackManager';

// Native audio layer (integration with MainComposition)
export { NativeAudioLayer } from './NativeAudioLayer';
