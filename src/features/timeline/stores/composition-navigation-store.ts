import { create } from 'zustand';

/**
 * Navigation breadcrumb entry for composition hierarchy.
 * Tracks which composition the user is currently editing.
 */
export interface CompositionBreadcrumb {
  /** compositionId — null for root (main timeline) */
  compositionId: string | null;
  /** Display label */
  label: string;
}

interface CompositionNavigationState {
  /** Stack of composition breadcrumbs — last entry is the current view */
  breadcrumbs: CompositionBreadcrumb[];
  /** The compositionId currently being viewed (null = root timeline) */
  activeCompositionId: string | null;
}

interface CompositionNavigationActions {
  /** Enter a sub-composition for editing */
  enterComposition: (compositionId: string, label: string) => void;
  /** Exit the current sub-composition (go up one level) */
  exitComposition: () => void;
  /** Navigate directly to a specific breadcrumb level */
  navigateTo: (index: number) => void;
  /** Reset to root timeline */
  resetToRoot: () => void;
}

export const useCompositionNavigationStore = create<
  CompositionNavigationState & CompositionNavigationActions
>()((set) => ({
  breadcrumbs: [{ compositionId: null, label: 'Main Timeline' }],
  activeCompositionId: null,

  enterComposition: (compositionId, label) =>
    set((state) => {
      const newBreadcrumbs = [
        ...state.breadcrumbs,
        { compositionId, label },
      ];
      return {
        breadcrumbs: newBreadcrumbs,
        activeCompositionId: compositionId,
      };
    }),

  exitComposition: () =>
    set((state) => {
      if (state.breadcrumbs.length <= 1) return state;
      const newBreadcrumbs = state.breadcrumbs.slice(0, -1);
      const lastEntry = newBreadcrumbs[newBreadcrumbs.length - 1]!;
      return {
        breadcrumbs: newBreadcrumbs,
        activeCompositionId: lastEntry.compositionId,
      };
    }),

  navigateTo: (index) =>
    set((state) => {
      if (index < 0 || index >= state.breadcrumbs.length) return state;
      const newBreadcrumbs = state.breadcrumbs.slice(0, index + 1);
      const lastEntry = newBreadcrumbs[newBreadcrumbs.length - 1]!;
      return {
        breadcrumbs: newBreadcrumbs,
        activeCompositionId: lastEntry.compositionId,
      };
    }),

  resetToRoot: () =>
    set({
      breadcrumbs: [{ compositionId: null, label: 'Main Timeline' }],
      activeCompositionId: null,
    }),
}));
