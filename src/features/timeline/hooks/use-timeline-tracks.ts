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
   * Add a new track to the timeline (at the top/beginning)
   */
  const addTrack = useCallback(
    (track: TimelineTrack) => {
      setTracks([track, ...tracks]);
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
   * Remove multiple tracks by IDs
   */
  const removeTracks = useCallback(
    (ids: string[]) => {
      setTracks(tracks.filter((track) => !ids.includes(track.id)));
    },
    [tracks, setTracks]
  );

  /**
   * Insert a new track before a specific track ID (so it appears above it)
   * If beforeTrackId is not found or null, inserts at the top
   */
  const insertTrack = useCallback(
    (track: TimelineTrack, beforeTrackId: string | null = null) => {
      if (!beforeTrackId) {
        // Insert at the top (beginning)
        setTracks([track, ...tracks]);
        return;
      }

      const index = tracks.findIndex((t) => t.id === beforeTrackId);
      if (index === -1) {
        // Track not found, insert at the top
        setTracks([track, ...tracks]);
        return;
      }

      // Insert before the found track (same index position)
      const newTracks = [...tracks];
      newTracks.splice(index, 0, track);
      setTracks(newTracks);
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
   * Toggle track visibility
   */
  const toggleTrackVisibility = useCallback(
    (id: string) => {
      updateTrack(id, {
        visible: !tracks.find((t) => t.id === id)?.visible,
      });
    },
    [tracks, updateTrack]
  );

  /**
   * Toggle track audio muted state
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
   * Only one track can be soloed at a time - soloíng a track will unsolo all others
   */
  const toggleTrackSolo = useCallback(
    (id: string) => {
      const targetTrack = tracks.find((t) => t.id === id);
      const isCurrentlySolo = targetTrack?.solo;

      // If track is currently solo, just unsolo it
      // If track is not solo, solo it and unsolo all others
      setTracks(
        tracks.map((track) => ({
          ...track,
          solo: track.id === id ? !isCurrentlySolo : false,
        }))
      );
    },
    [tracks, setTracks]
  );

  return {
    tracks,
    addTrack,
    removeTrack,
    removeTracks,
    insertTrack,
    updateTrack,
    reorderTracks,
    toggleTrackLock,
    toggleTrackVisibility,
    toggleTrackMute,
    toggleTrackSolo,
  };
}
