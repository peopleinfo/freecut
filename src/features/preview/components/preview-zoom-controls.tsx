import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePreviewZoom, type ZoomPreset } from '../hooks/use-preview-zoom';

interface PreviewZoomControlsProps {
  containerWidth?: number;
  containerHeight?: number;
  projectWidth: number;
  projectHeight: number;
}

/**
 * Preview Zoom Controls Component
 *
 * Provides UI for controlling preview zoom:
 * - Preset buttons (Fit, 50%, 100%, 200%)
 * - Zoom in/out buttons
 * - Reset to 100% button
 * - Fine-tune slider (10% - 200%)
 * - Current zoom percentage display
 */
export function PreviewZoomControls({
  containerWidth,
  containerHeight,
  projectWidth,
  projectHeight,
}: PreviewZoomControlsProps) {
  const {
    zoom,
    setZoom,
    zoomPresets,
    handlePresetZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  } = usePreviewZoom({
    containerWidth,
    containerHeight,
    projectWidth,
    projectHeight,
  });

  return (
    <div className="flex flex-col gap-3 bg-background/95 backdrop-blur-sm p-3 rounded-lg border border-border shadow-lg">
      {/* Preset Buttons */}
      <div className="flex items-center gap-2">
        {zoomPresets.map((preset) => (
          <Button
            key={preset.label}
            variant={zoom === preset.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs font-medium"
            onClick={() => handlePresetZoom(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={zoomOut}
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        {/* Zoom Percentage Display */}
        <span className="text-xs font-mono font-medium w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={zoomIn}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={resetZoom}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset to 100%</TooltipContent>
        </Tooltip>
      </div>

      {/* Fine-tune Slider */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground">10%</span>
        <Slider
          value={[zoom * 100]}
          onValueChange={([value]) => setZoom(value / 100)}
          min={10}
          max={200}
          step={5}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">200%</span>
      </div>
    </div>
  );
}
