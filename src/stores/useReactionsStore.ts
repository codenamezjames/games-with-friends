import { create } from 'zustand';
import type { Reaction } from '@/types';
import { REACTION_DISPLAY_DURATION_MS } from '@/components/reactions/constants';

interface ReactionsState {
  activeReactions: Reaction[];
  addReaction: (reaction: Reaction) => void;
  removeReaction: (id: string) => void;
  clearReactions: () => void;
}

export const useReactionsStore = create<ReactionsState>((set) => ({
  activeReactions: [],

  addReaction: (reaction) => {
    set((state) => ({
      activeReactions: [...state.activeReactions, reaction],
    }));

    // Auto-remove after display duration
    setTimeout(() => {
      set((state) => ({
        activeReactions: state.activeReactions.filter((r) => r.id !== reaction.id),
      }));
    }, REACTION_DISPLAY_DURATION_MS);
  },

  removeReaction: (id) =>
    set((state) => ({
      activeReactions: state.activeReactions.filter((r) => r.id !== id),
    })),

  clearReactions: () => set({ activeReactions: [] }),
}));
