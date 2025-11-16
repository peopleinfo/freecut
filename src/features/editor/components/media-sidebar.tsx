import { Activity } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Film,
  Layers,
  Video,
  FileAudio,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Copy,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../stores/editor-store';

// Mock media items - TODO: Replace with media-library-store
const mediaItems = [
  { id: '1', name: 'intro.mp4', type: 'video' as const, duration: '0:15', size: '24.5 MB' },
  { id: '2', name: 'background.mp3', type: 'audio' as const, duration: '0:30', size: '3.2 MB' },
  { id: '3', name: 'logo.png', type: 'image' as const, size: '1.2 MB' },
];

export function MediaSidebar() {
  // Use granular selectors - Zustand v5 best practice
  const leftSidebarOpen = useEditorStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <>
      {/* Left Sidebar */}
      <div
        className={`panel-bg border-r border-border transition-all duration-200 flex-shrink-0 ${
          leftSidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        {/* Use Activity for React 19 performance optimization */}
        <Activity mode={leftSidebarOpen ? 'visible' : 'hidden'}>
          <div className="h-full flex flex-col w-72 animate-slide-in-left">
            {/* Sidebar Header */}
            <div className="h-11 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'media' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveTab('media')}
                >
                  <Film className="w-3 h-3 mr-1.5" />
                  Media
                </Button>
                <Button
                  variant={activeTab === 'effects' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveTab('effects')}
                >
                  <Layers className="w-3 h-3 mr-1.5" />
                  Effects
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleLeftSidebar}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Media Items */}
            {activeTab === 'media' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Import Button */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-3 border-dashed hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Import Media</div>
                    <div className="text-xs text-muted-foreground">
                      Drag files here or click
                    </div>
                  </div>
                </Button>

                <Separator className="my-3" />

                {/* Media Grid */}
                <div className="space-y-1.5">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-md border border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 p-2 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {item.type === 'video' && (
                            <Video className="w-5 h-5 text-primary" />
                          )}
                          {item.type === 'audio' && (
                            <FileAudio className="w-5 h-5 text-green-500" />
                          )}
                          {item.type === 'image' && (
                            <ImageIcon className="w-5 h-5 text-blue-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.duration && `${item.duration} • `}
                            {item.size}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Plus className="w-3 h-3 mr-2" />
                              Add to Timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-3 h-3 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === 'effects' && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  Effects library coming soon
                </div>
              </div>
            )}
          </div>
        </Activity>
      </div>

      {/* Left Sidebar Toggle */}
      {!leftSidebarOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleLeftSidebar}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-20 bg-secondary/50 hover:bg-secondary border border-border rounded-r-md flex items-center justify-center transition-all hover:w-7"
            >
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Show Media Panel</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
