import { create } from 'zustand';

interface Feedback {
  message: string;
  type: 'success' | 'error';
}

interface LocalGameState {
  // State
  currentPath: number[];
  isTracing: boolean;
  lastFeedback: Feedback | null;

  // Actions
  startTrace: (cellIndex: number) => void;
  addToPath: (cellIndex: number) => void;
  removeLastFromPath: () => void;
  endTrace: () => void;
  clearPath: () => void;
  setFeedback: (feedback: Feedback | null) => void;
  reset: () => void;
}

const initialState = {
  currentPath: [],
  isTracing: false,
  lastFeedback: null,
};

export const useLocalGameStore = create<LocalGameState>((set) => ({
  ...initialState,

  startTrace: (cellIndex) =>
    set({
      isTracing: true,
      currentPath: [cellIndex],
    }),

  addToPath: (cellIndex) =>
    set((state) => ({
      currentPath: [...state.currentPath, cellIndex],
    })),

  removeLastFromPath: () =>
    set((state) => ({
      currentPath: state.currentPath.slice(0, -1),
    })),

  endTrace: () =>
    set({
      isTracing: false,
    }),

  clearPath: () =>
    set({
      currentPath: [],
      isTracing: false,
    }),

  setFeedback: (feedback) => set({ lastFeedback: feedback }),

  reset: () => set(initialState),
}));
