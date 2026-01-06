import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, RoomStatus, GameSettings } from '@/types';
import { DEFAULT_GAME_SETTINGS } from '@/types';

interface RoomState {
  // State
  roomCode: string | null;
  playerId: string | null;
  playerName: string;
  isHost: boolean;
  isSpectator: boolean;
  players: Record<string, Player>;
  roomStatus: RoomStatus | null;
  gameType: string | null;
  gameSettings: GameSettings;

  // Actions
  setRoomCode: (code: string | null) => void;
  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setIsHost: (value: boolean) => void;
  setIsSpectator: (value: boolean) => void;
  setPlayers: (players: Record<string, Player>) => void;
  setRoomStatus: (status: RoomStatus | null) => void;
  setGameType: (type: string | null) => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  resetRoom: () => void;
}

const initialState = {
  roomCode: null,
  playerId: null,
  playerName: '',
  isHost: false,
  isSpectator: false,
  players: {},
  roomStatus: null,
  gameType: null,
  gameSettings: DEFAULT_GAME_SETTINGS,
};

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      ...initialState,

      setRoomCode: (code) => set({ roomCode: code }),
      setPlayerId: (id) => set({ playerId: id }),
      setPlayerName: (name) => set({ playerName: name }),
      setIsHost: (value) => set({ isHost: value }),
      setIsSpectator: (value) => set({ isSpectator: value }),
      setPlayers: (players) => set({ players }),
      setRoomStatus: (status) => set({ roomStatus: status }),
      setGameType: (type) => set({ gameType: type }),
      setGameSettings: (settings) =>
        set((state) => ({
          gameSettings: { ...state.gameSettings, ...settings },
        })),
      resetRoom: () => set(initialState),
    }),
    {
      name: 'word-trace-room',
      // Only persist essential data for rejoin
      partialize: (state) => ({
        roomCode: state.roomCode,
        playerId: state.playerId,
        playerName: state.playerName,
        isHost: state.isHost,
        isSpectator: state.isSpectator,
        gameType: state.gameType,
        gameSettings: state.gameSettings,
      }),
    }
  )
);
