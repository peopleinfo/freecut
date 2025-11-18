import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TimelineState, TimelineActions } from '../types';
import { getProject, updateProject } from '@/lib/storage/indexeddb';
import type { ProjectTimeline } from '@/types/project';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const currentFrame = useTimelineStore(s => s.currentFrame);
// const setCurrentFrame = useTimelineStore(s => s.setCurrentFrame);
//
// ❌ WRONG: Don't destructure the entire store
// const { currentFrame, setCurrentFrame } = useTimelineStore();
//
// UNDO/REDO: This store is wrapped with Zundo's temporal middleware
// Access undo/redo functionality:
// const undo = useTimelineStore.temporal.getState().undo;
// const redo = useTimelineStore.temporal.getState().redo;
// const canUndo = useTimelineStore((state) => state.pastStates.length > 0);

export const useTimelineStore = create<TimelineState & TimelineActions>()(
  temporal((set) => ({
  // State
  tracks: [],
  items: [],
  fps: 30,
  scrollPosition: 0,
  snapEnabled: true,

  // Actions
  setTracks: (tracks) => set({ tracks }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, updates) => set((state) => ({
    items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  })),
  removeItems: (ids) => set((state) => ({
    items: state.items.filter((i) => !ids.includes(i.id)),
  })),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  moveItem: (id, newFrom, newTrackId) => set((state) => ({
    items: state.items.map((i) =>
      i.id === id
        ? { ...i, from: newFrom, ...(newTrackId && { trackId: newTrackId }) }
        : i
    ),
  })),
  moveItems: (updates) => set((state) => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    return {
      items: state.items.map((i) => {
        const update = updateMap.get(i.id);
        return update
          ? { ...i, from: update.from, ...(update.trackId && { trackId: update.trackId }) }
          : i;
      }),
    };
  }),

  // Save timeline to project in IndexedDB
  saveTimeline: async (projectId) => {
    const state = useTimelineStore.getState();

    try {
      // Get the current project
      const project = await getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Prepare timeline data (serialize tracks without items since items are separate)
      const timelineData: ProjectTimeline = {
        tracks: state.tracks.map(track => ({
          id: track.id,
          name: track.name,
          height: track.height,
          locked: track.locked,
          muted: track.muted,
          solo: track.solo,
          color: track.color,
          order: track.order,
        })),
        items: state.items.map(item => ({
          id: item.id,
          trackId: item.trackId,
          from: item.from,
          durationInFrames: item.durationInFrames,
          label: item.label,
          mediaId: item.mediaId,
          type: item.type,
          ...(item.type === 'video' && {
            src: item.src,
            thumbnailUrl: item.thumbnailUrl,
            offset: item.offset,
          }),
          ...(item.type === 'audio' && {
            src: item.src,
            waveformData: item.waveformData,
            offset: item.offset,
          }),
          ...(item.type === 'text' && {
            text: item.text,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            color: item.color,
          }),
          ...(item.type === 'image' && {
            src: item.src,
            thumbnailUrl: item.thumbnailUrl,
          }),
          ...(item.type === 'shape' && {
            shapeType: item.shapeType,
            fillColor: item.fillColor,
          }),
        })),
      };

      // Update project with timeline data
      await updateProject(projectId, {
        timeline: timelineData,
      });
    } catch (error) {
      console.error('Failed to save timeline:', error);
      throw error;
    }
  },

  // Load timeline from project in IndexedDB
  loadTimeline: async (projectId) => {
    try {
      const project = await getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      if (project.timeline) {
        // Restore tracks and items from project
        set({
          tracks: project.timeline.tracks.map(track => ({
            ...track,
            items: [], // Items are stored separately
          })),
          items: project.timeline.items as any, // Type assertion needed due to serialization
        });
      } else {
        // Initialize with empty state for new projects
        set({
          tracks: [],
          items: [],
        });
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
      throw error;
    }
  },

  // Clear timeline (reset to empty state)
  clearTimeline: () => set({
    tracks: [],
    items: [],
    scrollPosition: 0,
  }),
  }))
);
