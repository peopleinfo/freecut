/**
 * AudioElement.tsx - Individual audio component with Web Audio API
 *
 * Features:
 * - Web Audio API for volume control (supports boost > 1x)
 * - Pitch preservation when changing playback rate
 * - Audio fades (linear and equal-power)
 * - Frame-accurate sync with Clock system
 * - Preloading support
 *
 * This component manages a single audio element and syncs it
 * with the player's Clock system.
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from 'react';
import type { AudioElementProps, AudioElementState, AudioNodes } from './types';
import { dbToLinear, calculateLinearFade, calculateEqualPowerFade, type AudioFadeConfig } from './types';
import { getAudioContext, resumeAudioContext } from './use-audio-context';

/**
 * Imperative handle for AudioElement
 */
export interface AudioElementHandle {
  /** Get the underlying audio element */
  getAudioElement: () => HTMLAudioElement | null;
  /** Seek to a specific time in seconds */
  seekTo: (time: number) => void;
  /** Play the audio */
  play: () => Promise<void>;
  /** Pause the audio */
  pause: () => void;
  /** Get current time in seconds */
  getCurrentTime: () => number;
  /** Get audio duration in seconds */
  getDuration: () => number;
  /** Get current state */
  getState: () => AudioElementState;
  /** Get Web Audio nodes */
  getAudioNodes: () => AudioNodes | null;
}

// Track audio elements connected to Web Audio API
// An audio element can only be connected to ONE MediaElementSourceNode ever
const connectedAudioElements = new WeakSet<HTMLAudioElement>();
const audioNodesMap = new WeakMap<HTMLAudioElement, AudioNodes>();

/**
 * AudioElement Component
 *
 * A controlled audio component that syncs its playback state
 * with external props and the Clock system.
 */
export const AudioElement = memo(
  forwardRef<AudioElementHandle, AudioElementProps>(
    (
      {
        src,
        id: _id,
        startTime = 0,
        currentTime,
        isPlaying,
        playbackRate = 1,
        volumeDb = 0,
        muted = false,
        fadeIn = 0,
        fadeOut = 0,
        duration,
        preservePitch = true,
        onReady,
        onError,
        onBuffering,
        onTimeUpdate,
      },
      ref
    ) => {
      // Refs
      const audioRef = useRef<HTMLAudioElement | null>(null);
      const audioNodesRef = useRef<AudioNodes | null>(null);
      const lastSyncTimeRef = useRef<number>(Date.now());
      const lastSeekTimeRef = useRef<number>(0);
      const needsInitialSyncRef = useRef<boolean>(true);

      // State
      const [state, setState] = useState<AudioElementState>({
        ready: false,
        loading: true,
        error: null,
        buffering: false,
        currentTime: 0,
        duration: 0,
      });

      // Calculate fade multiplier
      const getFadeMultiplier = useCallback(
        (time: number, useEqualPower: boolean = false): number => {
          const config: AudioFadeConfig = {
            fadeIn,
            fadeOut,
            duration,
          };

          return useEqualPower
            ? calculateEqualPowerFade(time, config)
            : calculateLinearFade(time, config);
        },
        [fadeIn, fadeOut, duration]
      );

      // Calculate final volume
      const calculateVolume = useCallback(
        (time: number): number => {
          if (muted) return 0;

          const linearVolume = dbToLinear(volumeDb);
          const fadeMultiplier = getFadeMultiplier(time);

          return Math.max(0, linearVolume * fadeMultiplier);
        },
        [muted, volumeDb, getFadeMultiplier]
      );

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getAudioElement: () => audioRef.current,

          seekTo: (time: number) => {
            const audio = audioRef.current;
            if (!audio) return;

            try {
              audio.currentTime = time;
              lastSeekTimeRef.current = time;
            } catch (error) {
              console.warn('[AudioElement] Seek failed:', error);
            }
          },

          play: async () => {
            const audio = audioRef.current;
            if (!audio) return;

            // Resume AudioContext if needed
            await resumeAudioContext();

            try {
              await audio.play();
            } catch (error) {
              if ((error as Error).name !== 'AbortError') {
                console.error('[AudioElement] Play failed:', error);
                onError?.(error as Error);
              }
            }
          },

          pause: () => {
            audioRef.current?.pause();
          },

          getCurrentTime: () => {
            return audioRef.current?.currentTime ?? 0;
          },

          getDuration: () => {
            return audioRef.current?.duration ?? 0;
          },

          getState: () => state,

          getAudioNodes: () => audioNodesRef.current,
        }),
        [state, onError]
      );

      // Create audio element and set up Web Audio API
      useEffect(() => {
        const audio = new Audio();
        audio.src = src;
        audio.preload = 'auto';
        audio.preservesPitch = preservePitch;
        // @ts-expect-error - webkit prefix for older Safari
        audio.webkitPreservesPitch = preservePitch;
        audioRef.current = audio;

        // Event handlers
        const handleLoadedMetadata = () => {
          setState((prev) => ({
            ...prev,
            duration: audio.duration,
            loading: false,
          }));
        };

        const handleCanPlay = () => {
          setState((prev) => ({
            ...prev,
            ready: true,
            loading: false,
            buffering: false,
          }));
          onReady?.();
        };

        const handleWaiting = () => {
          setState((prev) => ({ ...prev, buffering: true }));
          onBuffering?.(true);
        };

        const handlePlaying = () => {
          setState((prev) => ({ ...prev, buffering: false }));
          onBuffering?.(false);
        };

        const handleError = () => {
          const error = audio.error;
          const errorMessage = error
            ? `Audio error: ${error.code} - ${error.message}`
            : 'Unknown audio error';

          const err = new Error(errorMessage);
          setState((prev) => ({
            ...prev,
            error: err,
            loading: false,
            ready: false,
          }));
          onError?.(err);
        };

        const handleTimeUpdate = () => {
          setState((prev) => ({
            ...prev,
            currentTime: audio.currentTime,
          }));
          onTimeUpdate?.(audio.currentTime);
        };

        // Attach event listeners
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('error', handleError);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        // Set up Web Audio API if not already connected
        if (!connectedAudioElements.has(audio)) {
          try {
            const audioContext = getAudioContext();
            const gainNode = audioContext.createGain();
            const sourceNode = audioContext.createMediaElementSource(audio);

            sourceNode.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const nodes: AudioNodes = {
              context: audioContext,
              source: sourceNode,
              gain: gainNode,
            };

            connectedAudioElements.add(audio);
            audioNodesMap.set(audio, nodes);
            audioNodesRef.current = nodes;
          } catch (error) {
            console.warn('[AudioElement] Failed to set up Web Audio:', error);
          }
        } else {
          // Retrieve existing nodes
          const existingNodes = audioNodesMap.get(audio);
          if (existingNodes) {
            audioNodesRef.current = existingNodes;
          }
        }

        return () => {
          // Clean up
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('waiting', handleWaiting);
          audio.removeEventListener('playing', handlePlaying);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('timeupdate', handleTimeUpdate);

          audio.pause();
          audio.src = '';
          audioRef.current = null;

          // Clean up Web Audio nodes
          const nodes = audioNodesRef.current;
          if (nodes) {
            nodes.source.disconnect();
            nodes.gain.disconnect();
          }
          audioNodesRef.current = null;
        };
      }, [src, preservePitch, onReady, onError, onBuffering, onTimeUpdate]);

      // Update playback rate
      useEffect(() => {
        const audio = audioRef.current;
        if (audio && audio.playbackRate !== playbackRate) {
          audio.playbackRate = playbackRate;
        }
      }, [playbackRate]);

      // Update volume using Web Audio GainNode
      useEffect(() => {
        const nodes = audioNodesRef.current;
        if (!nodes) return;

        const volume = calculateVolume(currentTime);
        nodes.gain.gain.value = volume;
      }, [currentTime, calculateVolume]);

      // Sync playback with Clock
      useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Calculate target time in the source audio
        // currentTime is the time within this audio item
        // startTime is the offset in the source file
        const targetTime = startTime + currentTime * playbackRate;

        // Guard: Only seek if audio has enough data loaded
        const canSeek = audio.readyState >= 1;

        if (isPlaying) {
          const audioCurrentTime = audio.currentTime;
          const now = Date.now();

          // Calculate drift: positive = audio ahead, negative = audio behind
          const drift = audioCurrentTime - targetTime;
          const timeSinceLastSync = now - lastSyncTimeRef.current;

          // Only sync if audio is behind (never seek backwards to avoid glitches)
          const audioBehind = drift < -0.2;
          const needsSync = needsInitialSyncRef.current || (audioBehind && timeSinceLastSync > 500);

          if (needsSync && canSeek) {
            try {
              audio.currentTime = targetTime;
              lastSyncTimeRef.current = now;
              needsInitialSyncRef.current = false;
            } catch {
              // Seek failed - audio may not be ready
            }
          }

          // Play if paused and ready
          if (audio.paused && audio.readyState >= 2) {
            resumeAudioContext().then(() => {
              audio.play().catch(() => {
                // Autoplay might be blocked
              });
            });
          }
        } else {
          // Pause when not playing
          if (!audio.paused) {
            audio.pause();
          }

          // Seek when paused (for scrubbing)
          if (canSeek && Math.abs(audio.currentTime - targetTime) > 0.05) {
            try {
              audio.currentTime = targetTime;
            } catch {
              // Seek failed
            }
          }
        }
      }, [currentTime, startTime, isPlaying, playbackRate]);

      // This component renders nothing visually
      return null;
    }
  )
);

AudioElement.displayName = 'AudioElement';

export default AudioElement;
