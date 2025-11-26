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
   * Automatically sets order to be lowest (appears at top after sorting)
   */
  const addTrack = useCallback(
    (track: TimelineTrack) => {
      // Give it an order lower than all existing tracks
      const minOrder = tracks.length > 0
        ? Math.min(...tracks.map(t => t.order ?? 0))
        : 0;
      const trackWithOrder = { ...track, order: minOrder - 1 };
      setTracks([trackWithOrder, ...tracks]);
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
   * Sets the order property so the track sorts correctly
   */
  const insertTrack = useCallback(
    (track: TimelineTrack, beforeTrackId: string | null = null) => {
      if (!beforeTrackId) {
        // Insert at the top - give it an order lower than all existing tracks
        const minOrder = tracks.length > 0
          ? Math.min(...tracks.map(t => t.order ?? 0))
          : 0;
        const trackWithOrder = { ...track, order: minOrder - 1 };
        setTracks([trackWithOrder, ...tracks]);
        return;
      }

      const targetIndex = tracks.findIndex((t) => t.id === beforeTrackId);
      if (targetIndex === -1) {
        // Track not found, insert at the top
        const minOrder = tracks.length > 0
          ? Math.min(...tracks.map(t => t.order ?? 0))
          : 0;
        const trackWithOrder = { ...track, order: minOrder - 1 };
        setTracks([trackWithOrder, ...tracks]);
        return;
      }

      // Get the target track's order and the track above it (if any)
      const targetOrder = tracks[targetIndex].order ?? targetIndex;
      const prevOrder = targetIndex > 0
        ? (tracks[targetIndex - 1].order ?? (targetIndex - 1))
        : targetOrder - 2; // Default to 2 less than target if no previous track

      // Set order between previous track and target track
      const newOrder = (prevOrder + targetOrder) / 2;
      const trackWithOrder = { ...track, order: newOrder };

      const newTracks = [...tracks];
      newTracks.splice(targetIndex, 0, trackWithOrder);
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
