/**
 * Player Context - React context for timeline and playback state
 * 
 * Provides shared state for the player component including:
 * - Current frame position
 * - Playback state (playing/paused)
 * - Playback rate
 * - Volume and mute state
 * - Timeline boundaries (in/out frames)
 */

import React, { createContext, useContext, useCallback, useMemo, useState, useRef } from 'react';

// Types
export interface TimelineContextValue {
  frame: number;
  playing: boolean;
  rootId: string;
  playbackRate: number;
  imperativePlaying: React.MutableRefObject<boolean>;
  setPlaybackRate: (rate: number) => void;
  inFrame: number | null;
  outFrame: number | null;
}

export interface SetTimelineContextValue {
  setFrame: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface MediaVolumeContextValue {
  mediaMuted: boolean;
  mediaVolume: number;
}

export interface SetMediaVolumeContextValue {
  setMediaMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setMediaVolume: (volume: number) => void;
}

// Contexts
export const TimelineContext = createContext<TimelineContextValue | null>(null);
export const SetTimelineContext = createContext<SetTimelineContextValue | null>(null);
export const MediaVolumeContext = createContext<MediaVolumeContextValue | null>(null);
export const SetMediaVolumeContext = createContext<SetMediaVolumeContextValue | null>(null);

// Constants
export const PLAYER_COMP_ID = 'player-comp';

/**
 * Hook to get the timeline context
 * @throws Error if not inside a Player component
 */
export function useTimelineContext(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimelineContext must be used within a Player component');
  }
  return context;
}

/**
 * Hook to get the timeline setter context
 */
export function useSetTimelineContext(): SetTimelineContextValue {
  const context = useContext(SetTimelineContext);
  if (!context) {
    throw new Error('useSetTimelineContext must be used within a Player component');
  }
  return context;
}

/**
 * Hook to get the media volume context
 */
export function useMediaVolumeContext(): MediaVolumeContextValue {
  const context = useContext(MediaVolumeContext);
  if (!context) {
    throw new Error('useMediaVolumeContext must be used within a Player component');
  }
  return context;
}

/**
 * Hook to get the media volume setter context
 */
export function useSetMediaVolumeContext(): SetMediaVolumeContextValue {
  const context = useContext(SetMediaVolumeContext);
  if (!context) {
    throw new Error('useSetMediaVolumeContext must be used within a Player component');
  }
  return context;
}

/**
 * Hook to get the current frame
 */
export function useCurrentFrame(): number {
  return useTimelineContext().frame;
}

/**
 * Hook to get the playing state
 */
export function useIsPlaying(): boolean {
  return useTimelineContext().playing;
}

/**
 * Hook to get the playback rate
 */
export function usePlaybackRate(): number {
  return useTimelineContext().playbackRate;
}

/**
 * Hook to get media volume state
 */
export function useMediaVolume(): { volume: number; isMuted: boolean } {
  const { mediaVolume, mediaMuted } = useMediaVolumeContext();
  return { volume: mediaVolume, isMuted: mediaMuted };
}

/**
 * Player Context Provider Props
 */
interface PlayerContextProviderProps {
  children: React.ReactNode;
  fps: number;
  durationInFrames: number;
  initialFrame?: number;
  initiallyMuted?: boolean;
  inFrame?: number | null;
  outFrame?: number | null;
  initialPlaybackRate?: number;
  onVolumeChange?: (volume: number, isMuted: boolean) => void;
}

/**
 * PlayerContextProvider - Provides all player contexts
 * 
 * Combines timeline, media volume, and setter contexts
 * into a single provider for easy use.
 */
export const PlayerContextProvider: React.FC<PlayerContextProviderProps> = ({
  children,
  // fps and durationInFrames are reserved for future validation features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fps: _fps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  durationInFrames: _durationInFrames,
  initialFrame = 0,
  initiallyMuted = false,
  inFrame = null,
  outFrame = null,
  initialPlaybackRate = 1,
  onVolumeChange,
}) => {
  // Timeline state
  const [frame, setFrame] = useState<Record<string, number>>(() => ({
    [PLAYER_COMP_ID]: initialFrame,
  }));
  const [playing, setPlaying] = useState(false);
  const [rootId] = useState('player-comp');
  const imperativePlaying = useRef(false);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(initialPlaybackRate);

  // Media volume state
  const [mediaMuted, setMediaMuted] = useState(initiallyMuted);
  const [mediaVolume, setMediaVolume] = useState(1);

  // Timeline context value
  const currentFrame = frame[PLAYER_COMP_ID] ?? 0;
  const timelineContextValue = useMemo((): TimelineContextValue => {
    return {
      frame: currentFrame,
      playing,
      rootId,
      playbackRate: currentPlaybackRate,
      imperativePlaying,
      setPlaybackRate: setCurrentPlaybackRate,
      inFrame,
      outFrame,
    };
  }, [currentFrame, playing, rootId, currentPlaybackRate, inFrame, outFrame]);

  // Timeline setter context value
  const setTimelineContextValue = useMemo((): SetTimelineContextValue => {
    return {
      setFrame,
      setPlaying,
    };
  }, [setFrame, setPlaying]);

  // Media volume context value
  const mediaVolumeContextValue = useMemo((): MediaVolumeContextValue => {
    return {
      mediaMuted,
      mediaVolume,
    };
  }, [mediaMuted, mediaVolume]);

  // Handle mute state changes - cast to match Dispatch<SetStateAction<boolean>>
  const handleMuteChange = useCallback(
    (muted: boolean | ((prev: boolean) => boolean)) => {
      const newMuted = typeof muted === 'function' ? muted(mediaMuted) : muted;
      setMediaMuted(newMuted);
      onVolumeChange?.(mediaVolume, newMuted);
    },
    [mediaVolume, onVolumeChange, mediaMuted],
  );

  return (
    <TimelineContext.Provider value={timelineContextValue}>
      <SetTimelineContext.Provider value={setTimelineContextValue}>
        <MediaVolumeContext.Provider value={mediaVolumeContextValue}>
          <SetMediaVolumeContext.Provider
            value={{
              setMediaMuted: handleMuteChange,
              setMediaVolume: (volume: number) => {
                setMediaVolume(volume);
                onVolumeChange?.(volume, mediaMuted);
              },
            }}
          >
            {children}
          </SetMediaVolumeContext.Provider>
        </MediaVolumeContext.Provider>
      </SetTimelineContext.Provider>
    </TimelineContext.Provider>
  );
};

/**
 * Hook to set the timeline frame position
 */
export function useSetTimelineFrame(): (frame: number) => void {
  const { setFrame } = useSetTimelineContext();
  const { inFrame, outFrame } = useTimelineContext();

  return useCallback(
    (newFrame: number) => {
      // Clamp to in/out bounds if set
      let clampedFrame = newFrame;
      if (inFrame !== null && clampedFrame < inFrame) {
        clampedFrame = inFrame;
      }
      if (outFrame !== null && clampedFrame > outFrame) {
        clampedFrame = outFrame;
      }

      setFrame((c) => ({
        ...c,
        [PLAYER_COMP_ID]: clampedFrame,
      }));
    },
    [setFrame, inFrame, outFrame],
  );
}

/**
 * Hook to get the current frame position
 */
export function useTimelinePosition(): number {
  return useTimelineContext().frame;
}

/**
 * Hook to use the playing state
 */
export function usePlayingState(): [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
  React.MutableRefObject<boolean>,
] {
  const { playing } = useTimelineContext();
  const { setPlaying } = useSetTimelineContext();
  const { imperativePlaying } = useTimelineContext();

  return [playing, setPlaying, imperativePlaying];
}

/**
 * Hook to set the playing state
 */
export function useSetPlaying(): (playing: boolean) => void {
  const { setPlaying } = useSetTimelineContext();
  return setPlaying;
}

/**
 * Calculate the actual first frame (considering inFrame)
 */
export function useActualFirstFrame(): number {
  const { inFrame } = useTimelineContext();
  return inFrame ?? 0;
}

/**
 * Calculate the actual last frame (considering outFrame and duration)
 */
export function useActualLastFrame(durationInFrames: number): number {
  const { outFrame } = useTimelineContext();
  return outFrame ?? durationInFrames - 1;
}

/**
 * Check if at the last frame
 */
export function useIsLastFrame(durationInFrames: number): boolean {
  const frame = useTimelinePosition();
  const lastFrame = useActualLastFrame(durationInFrames);
  return frame === lastFrame;
}

/**
 * Check if at the first frame
 */
export function useIsFirstFrame(): boolean {
  const frame = useTimelinePosition();
  const firstFrame = useActualFirstFrame();
  return frame === firstFrame;
}
