/**
 * use-audio-context.ts - Shared AudioContext management
 *
 * Provides a shared AudioContext for all audio elements to use.
 * This is important because:
 * 1. Browsers limit the number of AudioContexts
 * 2. AudioContext must be resumed after user interaction
 * 3. Sharing context reduces resource usage
 *
 * Usage:
 * ```tsx
 * const { audioContext, resume, state } = useSharedAudioContext();
 * ```
 */

import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import type React from 'react';

/**
 * AudioContext state
 */
export type AudioContextState = 'suspended' | 'running' | 'closed';

/**
 * Shared AudioContext value
 */
export interface SharedAudioContextValue {
  /** The shared AudioContext instance */
  audioContext: AudioContext | null;
  /** Current state of the AudioContext */
  state: AudioContextState;
  /** Resume the AudioContext (requires user interaction) */
  resume: () => Promise<void>;
  /** Suspend the AudioContext */
  suspend: () => Promise<void>;
  /** Create a GainNode connected to the destination */
  createGain: () => GainNode | null;
  /** Create an AnalyserNode */
  createAnalyser: () => AnalyserNode | null;
}

// Global singleton for the AudioContext
let globalAudioContext: AudioContext | null = null;
let globalContextListeners: Set<() => void> = new Set();

/**
 * Get or create the global AudioContext
 */
function getGlobalAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new AudioContext();

    // Listen for state changes
    globalAudioContext.onstatechange = () => {
      globalContextListeners.forEach((listener) => listener());
    };
  }
  return globalAudioContext;
}

/**
 * Subscribe to AudioContext state changes
 */
function subscribeToContextChanges(callback: () => void): () => void {
  globalContextListeners.add(callback);
  return () => {
    globalContextListeners.delete(callback);
  };
}

/**
 * React Context for shared AudioContext
 */
const AudioContextContext = createContext<SharedAudioContextValue | null>(null);

/**
 * Provider component for shared AudioContext
 */
export const AudioContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioContextState>('suspended');
  const contextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on mount
  useEffect(() => {
    const ctx = getGlobalAudioContext();
    contextRef.current = ctx;
    setState(ctx.state as AudioContextState);

    // Subscribe to state changes
    const unsubscribe = subscribeToContextChanges(() => {
      if (contextRef.current) {
        setState(contextRef.current.state as AudioContextState);
      }
    });

    return unsubscribe;
  }, []);

  // Resume the AudioContext
  const resume = useCallback(async () => {
    const ctx = contextRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
      setState(ctx.state as AudioContextState);
    }
  }, []);

  // Suspend the AudioContext
  const suspend = useCallback(async () => {
    const ctx = contextRef.current;
    if (ctx && ctx.state === 'running') {
      await ctx.suspend();
      setState(ctx.state as AudioContextState);
    }
  }, []);

  // Create a GainNode
  const createGain = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return null;
    return ctx.createGain();
  }, []);

  // Create an AnalyserNode
  const createAnalyser = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return null;
    return ctx.createAnalyser();
  }, []);

  const value: SharedAudioContextValue = {
    audioContext: contextRef.current,
    state,
    resume,
    suspend,
    createGain,
    createAnalyser,
  };

  return (
    <AudioContextContext.Provider value={value}>
      {children}
    </AudioContextContext.Provider>
  );
};

/**
 * Hook to use the shared AudioContext
 *
 * @returns SharedAudioContextValue
 */
export function useSharedAudioContext(): SharedAudioContextValue {
  const context = useContext(AudioContextContext);

  if (!context) {
    // Return a fallback if not within provider (creates its own context)
    return useFallbackAudioContext();
  }

  return context;
}

/**
 * Fallback hook when not within AudioContextProvider
 * Creates its own AudioContext instance
 */
function useFallbackAudioContext(): SharedAudioContextValue {
  const [state, setState] = useState<AudioContextState>('suspended');
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = getGlobalAudioContext();
    contextRef.current = ctx;
    setState(ctx.state as AudioContextState);

    const unsubscribe = subscribeToContextChanges(() => {
      if (contextRef.current) {
        setState(contextRef.current.state as AudioContextState);
      }
    });

    return unsubscribe;
  }, []);

  const resume = useCallback(async () => {
    const ctx = contextRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
      setState(ctx.state as AudioContextState);
    }
  }, []);

  const suspend = useCallback(async () => {
    const ctx = contextRef.current;
    if (ctx && ctx.state === 'running') {
      await ctx.suspend();
      setState(ctx.state as AudioContextState);
    }
  }, []);

  const createGain = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return null;
    return ctx.createGain();
  }, []);

  const createAnalyser = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return null;
    return ctx.createAnalyser();
  }, []);

  return {
    audioContext: contextRef.current,
    state,
    resume,
    suspend,
    createGain,
    createAnalyser,
  };
}

/**
 * Hook to automatically resume AudioContext on user interaction
 *
 * Call this in your top-level component to ensure AudioContext
 * is resumed when the user interacts with the page.
 */
export function useAutoResumeAudioContext(): void {
  const { state, resume } = useSharedAudioContext();

  useEffect(() => {
    if (state !== 'suspended') return;

    const handleInteraction = () => {
      resume();
    };

    // Resume on various user interactions
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [state, resume]);
}

/**
 * Hook to get the current sample rate
 */
export function useAudioSampleRate(): number {
  const { audioContext } = useSharedAudioContext();
  return audioContext?.sampleRate ?? 44100;
}

/**
 * Hook to create and manage a GainNode
 */
export function useGainNode(initialValue: number = 1): {
  gainNode: GainNode | null;
  setGain: (value: number) => void;
  gain: number;
} {
  const { audioContext } = useSharedAudioContext();
  const gainNodeRef = useRef<GainNode | null>(null);
  const [gain, setGainState] = useState(initialValue);

  useEffect(() => {
    if (!audioContext) return;

    const node = audioContext.createGain();
    node.gain.value = initialValue;
    gainNodeRef.current = node;

    return () => {
      node.disconnect();
      gainNodeRef.current = null;
    };
  }, [audioContext, initialValue]);

  const setGain = useCallback((value: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = value;
      setGainState(value);
    }
  }, []);

  return {
    gainNode: gainNodeRef.current,
    setGain,
    gain,
  };
}

/**
 * Utility: Get the global AudioContext directly (for non-React code)
 */
export function getAudioContext(): AudioContext {
  return getGlobalAudioContext();
}

/**
 * Utility: Resume the global AudioContext
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getGlobalAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}
