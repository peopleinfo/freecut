import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MousePointer2,
  Scissors,
  Type,
  Undo2,
  Redo2,
  Download,
} from 'lucide-react';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';

export interface ToolbarProps {
  projectId: string;
  project: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
  };
  onExport?: () => void;
}

export function Toolbar({ project, onExport }: ToolbarProps) {
  // Access undo/redo from Zundo temporal middleware
  const handleUndo = () => {
    useTimelineStore.temporal.getState().undo();
  };
  const handleRedo = () => {
    useTimelineStore.temporal.getState().redo();
  };

  return (
    <div className="panel-header h-14 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
      {/* Project Info */}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Back to Projects</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-col -space-y-0.5">
          <h1 className="text-sm font-medium leading-none">
            {project?.name || 'Untitled Project'}
          </h1>
          <span className="text-xs text-muted-foreground font-mono">
            {project?.width}×{project?.height} • {project?.fps}fps
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Tool Buttons */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-secondary/50 rounded-md border border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-state="active"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Selection Tool (V)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Scissors className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Razor Tool (C)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Type className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Text Tool (T)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleUndo}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleRedo}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Export */}
      <Button size="sm" className="gap-2 glow-primary-sm" onClick={onExport}>
        <Download className="w-4 h-4" />
        Export
      </Button>
    </div>
  );
}
