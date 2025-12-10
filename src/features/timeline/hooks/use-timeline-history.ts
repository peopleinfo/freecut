import { useTimelineStore, useCanUndo, useCanRedo } from '../stores/timeline-store';

export function useTimelineHistory() {
  const undo = () => useTimelineStore.temporal.getState().undo();
  const redo = () => useTimelineStore.temporal.getState().redo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
