/**
 * Timeline Scroll Context
 *
 * Provides scroll position and viewport dimensions to timeline components
 * for viewport-based culling and tile windowing.
 *
 * Uses deferred values to prevent blocking renders during scroll/zoom gestures.
 */

import { createContext, useContext, useDeferredValue, type ReactNode } from 'react';

interface TimelineScrollContextValue {
  /** Current scroll position (pixels from left) */
  scrollLeft: number;
  /** Viewport width in pixels */
  viewportWidth: number;
}

const TimelineScrollContext = createContext<TimelineScrollContextValue | null>(null);

interface TimelineScrollProviderProps {
  children: ReactNode;
  /** Current scroll position - updated during scroll events */
  scrollLeft: number;
  /** Container width - updated on resize */
  viewportWidth: number;
}

/**
 * Provider that wraps timeline components and provides scroll position.
 * Values are passed from TimelineContent where scroll tracking already exists.
 */
export function TimelineScrollProvider({
  children,
  scrollLeft,
  viewportWidth,
}: TimelineScrollProviderProps) {
  // Use deferred values to prevent blocking renders during rapid scroll updates
  const deferredScrollLeft = useDeferredValue(scrollLeft);
  const deferredViewportWidth = useDeferredValue(viewportWidth);

  const value: TimelineScrollContextValue = {
    scrollLeft: deferredScrollLeft,
    viewportWidth: deferredViewportWidth,
  };

  return (
    <TimelineScrollContext.Provider value={value}>
      {children}
    </TimelineScrollContext.Provider>
  );
}

/**
 * Hook to consume timeline scroll context.
 * Must be used within TimelineScrollProvider.
 */
export function useTimelineScrollContext(): TimelineScrollContextValue {
  const context = useContext(TimelineScrollContext);
  if (!context) {
    throw new Error('useTimelineScrollContext must be used within TimelineScrollProvider');
  }
  return context;
}

/**
 * Optional hook that returns default values if outside provider.
 * Useful for components that may be rendered outside the timeline.
 */
export function useTimelineScrollContextOptional(): TimelineScrollContextValue {
  const context = useContext(TimelineScrollContext);
  return context ?? { scrollLeft: 0, viewportWidth: 1920 };
}
