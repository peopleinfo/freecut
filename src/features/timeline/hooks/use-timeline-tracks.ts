import { useCallback } from 'react';
import type { TimelineTrack } from '@/types/timeline';
import { useTimelineStore } from '../stores/timeline-store';

/**
 * Timeline tracks management hook
 *
 * Uses granular Zustand selectors for optimal performance
 */
export function useTimelineTracks() {
  // Use granular selectors - Zustand v5 best practice
  const tracks = useTimelineStore((s) => s.tracks);
  const setTracks = useTimelineStore((s) => s.setTracks);

  /**
   * Add a new track to the timeline
   */
  const addTrack = useCallback(
    (track: TimelineTrack) => {
      setTracks([...tracks, track]);
    },
    [tracks, setTracks]
  );

  /**
   * Remove a track by ID
   */
  const removeTrack = useCallback(
    (id: string) => {
      setTracks(tracks.filter((track) => track.id !== id));
    },
    [tracks, setTracks]
  );

  /**
   * Update a track's properties
   */
  const updateTrack = useCallback(
    (id: string, updates: Partial<TimelineTrack>) => {
      setTracks(
        tracks.map((track) =>
          track.id === id ? { ...track, ...updates } : track
        )
      );
    },
    [tracks, setTracks]
  );

  /**
   * Reorder tracks based on array of track IDs
   */
  const reorderTracks = useCallback(
    (trackIds: string[]) => {
      const reordered = trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is TimelineTrack => t !== undefined);
      setTracks(reordered);
    },
    [tracks, setTracks]
  );

  /**
   * Toggle track locked state
   */
  const toggleTrackLock = useCallback(
    (id: string) => {
      updateTrack(id, {
        locked: !tracks.find((t) => t.id === id)?.locked,
      });
    },
    [tracks, updateTrack]
  );

  /**
   * Toggle track muted state
   */
  const toggleTrackMute = useCallback(
    (id: string) => {
      updateTrack(id, {
        muted: !tracks.find((t) => t.id === id)?.muted,
      });
    },
    [tracks, updateTrack]
  );

  /**
   * Toggle track solo state
   */
  const toggleTrackSolo = useCallback(
    (id: string) => {
      updateTrack(id, {
        solo: !tracks.find((t) => t.id === id)?.solo,
      });
    },
    [tracks, updateTrack]
  );

  return {
    tracks,
    addTrack,
    removeTrack,
    updateTrack,
    reorderTracks,
    toggleTrackLock,
    toggleTrackMute,
    toggleTrackSolo,
  };
}
