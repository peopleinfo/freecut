import { useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Heart,
  Pentagon,
} from 'lucide-react';
import { useEditorStore } from '../stores/editor-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { useSelectionStore } from '../stores/selection-store';
import { useProjectStore } from '@/features/projects/stores/project-store';
import { MediaLibrary } from '@/features/media-library/components/media-library';
import { findNearestAvailableSpace } from '@/features/timeline/utils/collision-utils';
import type { TextItem, ShapeItem, ShapeType, AdjustmentItem } from '@/types/timeline';

export function MediaSidebar() {
  // Use granular selectors - Zustand v5 best practice
  const leftSidebarOpen = useEditorStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  // Timeline and playback stores for adding elements
  // Don't subscribe to currentFrame - read from store in callbacks to avoid re-renders during playback
  const addItem = useTimelineStore((s) => s.addItem);
  const tracks = useTimelineStore((s) => s.tracks);
  const items = useTimelineStore((s) => s.items);
  const fps = useTimelineStore((s) => s.fps);
  const selectItems = useSelectionStore((s) => s.selectItems);
  const activeTrackId = useSelectionStore((s) => s.activeTrackId);
  const currentProject = useProjectStore((s) => s.currentProject);

  // Add text item to timeline at the best available position
  const handleAddText = useCallback(() => {
    // Use active track if available and not locked, otherwise find first available
    let targetTrack = activeTrackId
      ? tracks.find((t) => t.id === activeTrackId && t.visible !== false && !t.locked)
      : null;

    // Fallback to first available visible/unlocked track
    if (!targetTrack) {
      targetTrack = tracks.find((t) => t.visible !== false && !t.locked);
    }

    if (!targetTrack) {
      console.warn('No available track for text item');
      return;
    }

    // Default duration: 5 seconds
    const durationInFrames = fps * 5;

    // Find the best position: start at playhead, find nearest available space
    // Read currentFrame from store directly to avoid subscription
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition; // Fallback to proposed if no space found

    // Get canvas dimensions for initial transform
    const canvasWidth = currentProject?.metadata.width ?? 1920;
    const canvasHeight = currentProject?.metadata.height ?? 1080;

    // Create a new text item
    const textItem: TextItem = {
      id: crypto.randomUUID(),
      type: 'text',
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      label: 'Text',
      text: 'Your Text Here',
      fontSize: 60,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
      // Center the text on canvas
      transform: {
        x: 0,
        y: 0,
        width: canvasWidth * 0.8,
        height: canvasHeight * 0.3,
        rotation: 0,
        opacity: 1,
      },
    };

    addItem(textItem);
    // Select the new item
    selectItems([textItem.id]);
  }, [tracks, items, fps, currentProject, addItem, selectItems, activeTrackId]);

  // Add shape item to timeline at the best available position
  const handleAddShape = useCallback((shapeType: ShapeType) => {
    // Use active track if available and not locked, otherwise find first available
    let targetTrack = activeTrackId
      ? tracks.find((t) => t.id === activeTrackId && t.visible !== false && !t.locked)
      : null;

    // Fallback to first available visible/unlocked track
    if (!targetTrack) {
      targetTrack = tracks.find((t) => t.visible !== false && !t.locked);
    }

    if (!targetTrack) {
      console.warn('No available track for shape item');
      return;
    }

    // Default duration: 5 seconds
    const durationInFrames = fps * 5;

    // Find the best position: start at playhead, find nearest available space
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition;

    // Get canvas dimensions for initial transform
    const canvasWidth = currentProject?.metadata.width ?? 1920;
    const canvasHeight = currentProject?.metadata.height ?? 1080;

    // Shape size: 25% of canvas, centered
    const shapeSize = Math.min(canvasWidth, canvasHeight) * 0.25;

    // Create a new shape item with defaults based on shape type
    const shapeItem: ShapeItem = {
      id: crypto.randomUUID(),
      type: 'shape',
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      label: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
      shapeType,
      fillColor: '#3b82f6', // Blue
      strokeColor: undefined,
      strokeWidth: 0,
      cornerRadius: shapeType === 'rectangle' ? 0 : undefined,
      direction: shapeType === 'triangle' ? 'up' : undefined,
      points: shapeType === 'star' ? 5 : shapeType === 'polygon' ? 6 : undefined,
      innerRadius: shapeType === 'star' ? 0.5 : undefined,
      // Center the shape on canvas with locked aspect ratio
      transform: {
        x: 0,
        y: 0,
        width: shapeSize,
        height: shapeSize,
        rotation: 0,
        opacity: 1,
        aspectRatioLocked: true,
      },
    };

    addItem(shapeItem);
    // Select the new item
    selectItems([shapeItem.id]);
  }, [tracks, items, fps, currentProject, addItem, selectItems, activeTrackId]);

  // Add adjustment layer to timeline at the best available position
  const handleAddAdjustmentLayer = useCallback(() => {
    // Use active track if available and not locked, otherwise find first available
    let targetTrack = activeTrackId
      ? tracks.find((t) => t.id === activeTrackId && t.visible !== false && !t.locked)
      : null;

    // Fallback to first available visible/unlocked track
    if (!targetTrack) {
      targetTrack = tracks.find((t) => t.visible !== false && !t.locked);
    }

    if (!targetTrack) {
      console.warn('No available track for adjustment layer');
      return;
    }

    // Default duration: 5 seconds
    const durationInFrames = fps * 5;

    // Find the best position: start at playhead, find nearest available space
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition;

    // Create a new adjustment layer
    const adjustmentItem: AdjustmentItem = {
      id: crypto.randomUUID(),
      type: 'adjustment',
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      label: 'Adjustment Layer',
      effects: [], // Start with no effects, user adds via properties panel
      effectOpacity: 1,
    };

    addItem(adjustmentItem);
    // Select the new item
    selectItems([adjustmentItem.id]);
  }, [tracks, items, fps, addItem, selectItems, activeTrackId]);

  // Category items for the vertical nav
  const categories = [
    { id: 'media' as const, icon: Film, label: 'Media' },
    { id: 'text' as const, icon: Type, label: 'Text' },
    { id: 'shapes' as const, icon: Pentagon, label: 'Shapes' },
    { id: 'effects' as const, icon: Layers, label: 'Effects' },
  ];

  return (
    <div className="flex h-full flex-shrink-0">
      {/* Vertical Category Bar */}
      <div className="w-12 panel-header border-r border-border flex flex-col items-center flex-shrink-0">
        {/* Header row - aligned with content panel header */}
        <div className="h-10 flex items-center justify-center border-b border-border w-full">
          <button
            onClick={toggleLeftSidebar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            data-tooltip={leftSidebarOpen ? 'Collapse Panel' : 'Expand Panel'}
            data-tooltip-side="right"
          >
            {leftSidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Category Icons */}
        <div className="flex flex-col gap-1 py-2">
          {categories.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                if (activeTab === id && leftSidebarOpen) {
                  toggleLeftSidebar();
                } else {
                  setActiveTab(id);
                  if (!leftSidebarOpen) toggleLeftSidebar();
                }
              }}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all
                ${activeTab === id && leftSidebarOpen
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }
              `}
              data-tooltip={label}
              data-tooltip-side="right"
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content Panel */}
      <div
        className={`panel-bg border-r border-border transition-all duration-200 overflow-hidden ${
          leftSidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className={`h-full flex flex-col w-72 ${leftSidebarOpen ? 'block' : 'hidden'}`}>
          {/* Panel Header */}
          <div className="h-10 flex items-center px-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-medium text-foreground">
              {categories.find((c) => c.id === activeTab)?.label}
            </span>
          </div>

          {/* Media Tab - Full Media Library */}
          <div className={`flex-1 overflow-hidden ${activeTab === 'media' ? 'block' : 'hidden'}`}>
            <MediaLibrary />
          </div>

          {/* Text Tab */}
          <div className={`flex-1 overflow-y-auto p-3 ${activeTab === 'text' ? 'block' : 'hidden'}`}>
            <div className="space-y-3">
              <button
                onClick={handleAddText}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-md bg-timeline-text/20 border border-timeline-text/50 flex items-center justify-center group-hover:bg-timeline-text/30 flex-shrink-0">
                  <Type className="w-4 h-4 text-timeline-text" />
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  Add Text
                </span>
              </button>
            </div>
          </div>

          {/* Shapes Tab */}
          <div className={`flex-1 overflow-y-auto p-3 ${activeTab === 'shapes' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleAddShape('rectangle')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Square className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Rectangle
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('circle')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Circle className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Circle
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('triangle')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Triangle className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Triangle
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('ellipse')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Circle className="w-3.5 h-2.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Ellipse
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('star')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Star className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Star
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('polygon')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Hexagon className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Polygon
                    </span>
                  </button>

                  <button
                    onClick={() => handleAddShape('heart')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-timeline-shape/20 border border-timeline-shape/50 flex items-center justify-center group-hover:bg-timeline-shape/30">
                      <Heart className="w-3.5 h-3.5 text-timeline-shape" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Heart
                    </span>
                  </button>
            </div>
          </div>

          {/* Effects Tab */}
          <div className={`flex-1 overflow-y-auto p-3 ${activeTab === 'effects' ? 'block' : 'hidden'}`}>
            <div className="space-y-3">
              <button
                onClick={handleAddAdjustmentLayer}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-md bg-purple-500/20 border border-purple-500/50 flex items-center justify-center group-hover:bg-purple-500/30 flex-shrink-0">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-muted-foreground group-hover:text-foreground">
                    Adjustment Layer
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    Apply effects to tracks above
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
