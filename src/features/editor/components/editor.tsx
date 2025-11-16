import { TooltipProvider } from '@/components/ui/tooltip';
import { Toolbar } from './toolbar';
import { MediaSidebar } from './media-sidebar';
import { PropertiesSidebar } from './properties-sidebar';
import { PreviewArea } from './preview-area';
import { Timeline } from '@/features/timeline/components/timeline';
import { useTimelineShortcuts } from '@/features/timeline/hooks/use-timeline-shortcuts';

export interface EditorProps {
  projectId: string;
  project: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
  };
}

/**
 * Video Editor Component
 *
 * Modular architecture following CLAUDE.md guidelines:
 * - Uses Zustand stores with granular selectors (not local useState)
 * - Composed of specialized components (toolbar, sidebars, preview, timeline)
 * - React 19 optimizations with Activity components in sidebars
 * - Zundo temporal middleware for undo/redo in timeline
 * - Comprehensive keyboard shortcuts
 */
export function Editor({ projectId, project }: EditorProps) {
  // Enable keyboard shortcuts
  useTimelineShortcuts({
    onPlay: () => console.log('Playing'),
    onPause: () => console.log('Paused'),
    onSplit: () => console.log('Split clip'),
    onDelete: () => console.log('Delete clips'),
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export video for project:', projectId);
  };

  // TODO: Get actual timeline duration from project/timeline store
  const timelineDuration = 30; // 30 seconds placeholder

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <Toolbar
          projectId={projectId}
          project={project}
          onExport={handleExport}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Media Library */}
          <MediaSidebar />

          {/* Center - Preview */}
          <PreviewArea project={project} />

          {/* Right Sidebar - Properties */}
          <PropertiesSidebar />
        </div>

        {/* Bottom - Timeline */}
        <Timeline duration={timelineDuration} />
      </div>
    </TooltipProvider>
  );
}
