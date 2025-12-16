/**
 * Value Graph Editor - Main container component.
 * Interactive graph for editing keyframe values and timing.
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Keyframe, AnimatableProperty, KeyframeRef, BezierControlPoints } from '@/types/keyframe';
import { PROPERTY_LABELS } from '@/types/keyframe';
import type { GraphViewport, GraphKeyframePoint } from './types';
import { DEFAULT_GRAPH_PADDING, PROPERTY_VALUE_RANGES } from './types';
import { GraphGrid } from './graph-grid';
import { GraphKeyframes } from './graph-keyframe';
import { GraphCurves, GraphExtensionLines, GraphPlayhead } from './graph-curve';
import { GraphHandles } from './graph-handles';
import { useGraphInteraction } from './use-graph-interaction';

interface ValueGraphEditorProps {
  /** Item ID to show keyframes for */
  itemId: string;
  /** Keyframes organized by property */
  keyframesByProperty: Partial<Record<AnimatableProperty, Keyframe[]>>;
  /** Currently selected property (or null to show all) */
  selectedProperty?: AnimatableProperty | null;
  /** Selected keyframe IDs */
  selectedKeyframeIds?: Set<string>;
  /** Current playhead frame */
  currentFrame?: number;
  /** Total duration in frames */
  totalFrames?: number;
  /** Width of the editor */
  width?: number;
  /** Height of the editor */
  height?: number;
  /** Callback when keyframe is moved */
  onKeyframeMove?: (ref: KeyframeRef, newFrame: number, newValue: number) => void;
  /** Callback when bezier handles are moved */
  onBezierHandleMove?: (ref: KeyframeRef, bezier: BezierControlPoints) => void;
  /** Callback when selection changes */
  onSelectionChange?: (keyframeIds: Set<string>) => void;
  /** Callback when property selection changes */
  onPropertyChange?: (property: AnimatableProperty | null) => void;
  /** Callback when playhead is scrubbed (frame is clip-relative) */
  onScrub?: (frame: number) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Full-featured value graph editor for keyframe animation.
 * Shows keyframes as draggable points with interpolation curves.
 */
export const ValueGraphEditor = memo(function ValueGraphEditor({
  itemId,
  keyframesByProperty,
  selectedProperty = null,
  selectedKeyframeIds = new Set(),
  currentFrame = 0,
  totalFrames = 300,
  width = 600,
  height = 300,
  onKeyframeMove,
  onBezierHandleMove,
  onSelectionChange,
  onPropertyChange,
  onScrub,
  disabled = false,
  className,
}: ValueGraphEditorProps) {
  const padding = DEFAULT_GRAPH_PADDING;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Calculate heights for layout
  // Toolbar: ~28px (min-h-7), Scrubber: ~32px (frame label + bar), gaps: ~4px (gap-1)
  const toolbarHeight = 28;
  const scrubberHeight = onScrub ? 32 : 0;
  const gaps = 4; // gap-1 = 4px
  const totalFixedHeight = toolbarHeight + scrubberHeight + gaps;
  const graphHeight = Math.max(60, height - totalFixedHeight);

  // Get available properties
  const availableProperties = useMemo(
    () => Object.keys(keyframesByProperty) as AnimatableProperty[],
    [keyframesByProperty]
  );

  // Determine which property to show
  const displayProperty = selectedProperty || availableProperties[0] || null;

  // Get keyframes for the selected property
  const keyframes = useMemo(
    () => (displayProperty ? keyframesByProperty[displayProperty] || [] : []),
    [displayProperty, keyframesByProperty]
  );

  // Get property value range for fixed viewport bounds
  const propertyRange = displayProperty ? PROPERTY_VALUE_RANGES[displayProperty] : null;

  // Calculate viewport with fixed bounds based on property range and clip duration
  const calculateFittedViewport = useCallback((): GraphViewport => {
    return {
      width,
      height: graphHeight,
      startFrame: 0,
      endFrame: Math.max(totalFrames, 60),
      minValue: propertyRange?.min ?? 0,
      maxValue: propertyRange?.max ?? 1,
    };
  }, [totalFrames, width, graphHeight, propertyRange]);

  const [viewport, setViewport] = useState<GraphViewport>(() => calculateFittedViewport());

  // Update viewport when keyframes or property changes
  useEffect(() => {
    setViewport(calculateFittedViewport());
  }, [calculateFittedViewport, displayProperty]);

  // Convert keyframes to graph points
  const points = useMemo((): GraphKeyframePoint[] => {
    if (!displayProperty) return [];

    const graphLeft = padding.left;
    const graphTop = padding.top;
    const graphWidth = viewport.width - padding.left - padding.right;
    const graphHeight = viewport.height - padding.top - padding.bottom;
    const frameRange = viewport.endFrame - viewport.startFrame;
    const valueRange = viewport.maxValue - viewport.minValue;

    return keyframes.map((keyframe) => ({
      keyframe,
      itemId,
      property: displayProperty,
      x: graphLeft + ((keyframe.frame - viewport.startFrame) / frameRange) * graphWidth,
      y: graphTop + (1 - (keyframe.value - viewport.minValue) / valueRange) * graphHeight,
      isSelected: selectedKeyframeIds.has(keyframe.id),
      isDragging: false,
    }));
  }, [displayProperty, keyframes, itemId, viewport, padding, selectedKeyframeIds]);

  // Interaction handlers
  const {
    dragState,
    isDragging,
    previewValues,
    draggingHandle,
    handleKeyframePointerDown,
    handleKeyframeClick,
    handleBezierPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleBackgroundClick,
    zoomIn,
    zoomOut,
    fitToContent,
  } = useGraphInteraction({
    viewport,
    padding,
    points,
    selectedKeyframeIds,
    maxFrame: totalFrames,
    minValue: displayProperty ? PROPERTY_VALUE_RANGES[displayProperty]?.min : undefined,
    maxValue: displayProperty ? PROPERTY_VALUE_RANGES[displayProperty]?.max : undefined,
    onViewportChange: setViewport,
    onSelectionChange,
    onKeyframeMove,
    onBezierHandleMove,
    disabled,
  });

  // Update points with drag state and preview positions
  const pointsWithDragState = useMemo(() => {
    // If we're dragging and have preview values, update the dragged point's position
    if (isDragging && dragState?.type === 'keyframe' && previewValues) {
      const graphLeft = padding.left;
      const graphTop = padding.top;
      const graphWidth = viewport.width - padding.left - padding.right;
      const graphHeight = viewport.height - padding.top - padding.bottom;
      const frameRange = viewport.endFrame - viewport.startFrame;
      const valueRange = viewport.maxValue - viewport.minValue;

      return points.map((point) => {
        const isThisDragging = dragState.keyframeId === point.keyframe.id;
        if (isThisDragging) {
          // Calculate new screen position from preview values
          const newX = graphLeft + ((previewValues.frame - viewport.startFrame) / frameRange) * graphWidth;
          const newY = graphTop + (1 - (previewValues.value - viewport.minValue) / valueRange) * graphHeight;
          return {
            ...point,
            x: newX,
            y: newY,
            isDragging: true,
          };
        }
        return {
          ...point,
          isDragging: false,
        };
      });
    }

    // Not dragging - just update isDragging flag
    return points.map((point) => ({
      ...point,
      isDragging: dragState?.keyframeId === point.keyframe.id,
    }));
  }, [points, dragState, isDragging, previewValues, viewport, padding]);

  // Reset viewport (fit to content)
  const resetViewport = useCallback(() => {
    setViewport(calculateFittedViewport());
  }, [calculateFittedViewport]);

  // Handle property change
  const handlePropertySelect = useCallback(
    (value: string) => {
      const newProperty = value === 'all' ? null : (value as AnimatableProperty);
      onPropertyChange?.(newProperty);
    },
    [onPropertyChange]
  );

  // Attach native wheel event listener with passive: false to prevent page scroll
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    svg.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  return (
    <div className={cn('flex flex-col gap-1 h-full overflow-hidden', className)} style={{ height }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 flex-shrink-0 min-h-7">
        <div className="flex items-center gap-2">
          {/* Property selector */}
          <Select
            value={displayProperty || 'all'}
            onValueChange={handlePropertySelect}
            disabled={disabled || availableProperties.length === 0}
          >
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {availableProperties.map((prop) => (
                <SelectItem key={prop} value={prop} className="text-xs">
                  {PROPERTY_LABELS[prop]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Keyframe count */}
          <span className="text-xs text-muted-foreground">
            {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={zoomOut}
                disabled={disabled}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={zoomIn}
                disabled={disabled}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={fitToContent}
                disabled={disabled || keyframes.length === 0}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fit to content</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={resetViewport}
                disabled={disabled}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset view</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Graph */}
      <svg
        ref={svgRef}
        width={width}
        height={graphHeight}
        className={cn(
          'border border-border rounded-md flex-shrink-0',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
        style={{ touchAction: 'none' }}
      >
        {/* Grid background */}
        <GraphGrid viewport={viewport} padding={padding} />

        {/* Extension lines (before/after keyframes) */}
        <GraphExtensionLines points={pointsWithDragState} viewport={viewport} padding={padding} />

        {/* Interpolation curves */}
        <GraphCurves points={pointsWithDragState} selectedKeyframeIds={selectedKeyframeIds} />

        {/* Bezier handles (for selected keyframes with cubic-bezier easing) */}
        <GraphHandles
          points={pointsWithDragState}
          selectedKeyframeIds={selectedKeyframeIds}
          onHandlePointerDown={handleBezierPointerDown}
          draggingHandle={draggingHandle}
          disabled={disabled}
        />

        {/* Keyframe points */}
        <GraphKeyframes
          points={pointsWithDragState}
          previewValues={previewValues}
          onPointerDown={handleKeyframePointerDown}
          onClick={handleKeyframeClick}
          disabled={disabled}
        />

        {/* Playhead */}
        <GraphPlayhead frame={currentFrame} viewport={viewport} padding={padding} />
      </svg>

      {/* Timeline scrubber bar */}
      {onScrub && (
        <GraphScrubber
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          onScrub={onScrub}
          disabled={disabled}
        />
      )}

      {/* Keyboard hints (shows when dragging) */}
      {isDragging && dragState?.type === 'keyframe' && (
        <div className="text-xs text-muted-foreground text-center space-x-3">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> constrain axis</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Alt</kbd> fine adjust</span>
        </div>
      )}
    </div>
  );
});

/**
 * Timeline scrubber component - horizontal progress bar for scrubbing through the clip.
 */
const GraphScrubber = memo(function GraphScrubber({
  currentFrame,
  totalFrames,
  onScrub,
  disabled = false,
}: {
  currentFrame: number;
  totalFrames: number;
  onScrub: (frame: number) => void;
  disabled?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Calculate progress percentage
  const progress = totalFrames > 0 ? Math.min(100, Math.max(0, (currentFrame / totalFrames) * 100)) : 0;

  // Convert x position to frame
  const xToFrame = useCallback(
    (clientX: number): number => {
      const bar = barRef.current;
      if (!bar) return 0;
      
      const rect = bar.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      return Math.round(percent * (totalFrames - 1));
    },
    [totalFrames]
  );

  // Handle click/drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsScrubbing(true);
      onScrub(xToFrame(e.clientX));
    },
    [disabled, onScrub, xToFrame]
  );

  // Handle drag
  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      onScrub(xToFrame(e.clientX));
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, onScrub, xToFrame]);

  return (
    <div className="flex-shrink-0 px-2">
      {/* Frame indicator */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>0</span>
        <span className="text-foreground font-medium">Frame {currentFrame} / {totalFrames - 1}</span>
        <span>{totalFrames - 1}</span>
      </div>
      
      {/* Scrubber bar */}
      <div
        ref={barRef}
        className={cn(
          'relative h-3 bg-muted/50 rounded cursor-ew-resize overflow-hidden border border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/40 transition-none"
          style={{ width: `${progress}%` }}
        />
        
        {/* Playhead thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-2 h-full bg-primary rounded-sm',
            'transition-none'
          )}
          style={{ left: `calc(${progress}% - 4px)` }}
        />
      </div>
    </div>
  );
});

// Re-export types and components
export type { GraphViewport, GraphKeyframePoint, GraphPadding } from './types';
export { DEFAULT_GRAPH_PADDING } from './types';
