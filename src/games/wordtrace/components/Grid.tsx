import { useCallback, useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameStore } from '@/stores/useGameStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { getWordFromPath } from '@/games/wordtrace/utils';

/**
 * Get the cell index at a given screen coordinate using browser hit testing.
 * Returns null if no cell is found at the position.
 */
function getCellIndexAtPoint(x: number, y: number): number | null {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  // Walk up to find element with data-index (in case we hit a child)
  const cell = element.closest('[data-index]');
  if (!cell) return null;

  const index = cell.getAttribute('data-index');
  return index !== null ? parseInt(index, 10) : null;
}

/**
 * Check if two cell indices are adjacent (including diagonals).
 */
function isAdjacent(index1: number, index2: number, gridSize: number): boolean {
  const row1 = Math.floor(index1 / gridSize);
  const col1 = index1 % gridSize;
  const row2 = Math.floor(index2 / gridSize);
  const col2 = index2 % gridSize;

  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);

  // Adjacent means within 1 step in any direction (including diagonal)
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

interface GridProps {
  onWordSubmit: (word: string, path: number[]) => void;
  disabled?: boolean;
  isSpectator?: boolean;
}

export function Grid({ onWordSubmit, disabled = false, isSpectator = false }: GridProps) {
  const gridRef = useCallback((node: HTMLDivElement | null) => {
    // Store ref for future use
    if (node) {
      // Could measure actual cell sizes here if needed
    }
  }, []);

  const { grid, gridSize, phase } = useGameStore();
  const {
    currentPath,
    isTracing,
    startTrace,
    addToPath,
    removeLastFromPath,
    clearPath,
    endTrace,
  } = useLocalGameStore();

  // Track last selected cell to avoid duplicate processing
  const lastSelectedRef = useRef<number | null>(null);

  // Reset ref when trace ends
  useEffect(() => {
    if (!isTracing) {
      lastSelectedRef.current = null;
    }
  }, [isTracing]);
  const { play } = useSoundEffects();
  const { vibrate } = useHaptics();

  const isDisabled = phase !== 'playing' || disabled;

  // Tap to start trace
  const handlePointerDown = useCallback(
    (index: number) => {
      if (isDisabled) return;
      play('tileSelect');
      vibrate('tileSelect');
      startTrace(index);
    },
    [isDisabled, startTrace, play, vibrate]
  );

  // End trace and submit word
  const handlePointerUp = useCallback(() => {
    if (!isTracing) return;

    const word = getWordFromPath(grid, currentPath);

    if (word.length >= 3) {
      onWordSubmit(word, [...currentPath]);
    }

    endTrace();
    clearPath();
  }, [isTracing, grid, currentPath, onWordSubmit, endTrace, clearPath]);

  // Get the current word being traced
  const currentWord = getWordFromPath(grid, currentPath);

  // Handle drag selection using browser hit testing
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isTracing || isDisabled) return;

      const hoveredIndex = getCellIndexAtPoint(e.clientX, e.clientY);
      if (hoveredIndex === null) return;

      // Skip if same as last processed
      if (hoveredIndex === lastSelectedRef.current) return;

      const lastIndex = currentPath[currentPath.length - 1];

      // Backtracking: if hovering second-to-last cell, remove last
      if (currentPath.length >= 2 && hoveredIndex === currentPath[currentPath.length - 2]) {
        removeLastFromPath();
        lastSelectedRef.current = hoveredIndex;
        return;
      }

      // Skip if already in path
      if (currentPath.includes(hoveredIndex)) return;

      // Only add if adjacent to last cell
      if (isAdjacent(lastIndex, hoveredIndex, gridSize)) {
        play('tileSelect');
        vibrate('tileSelect');
        addToPath(hoveredIndex);
        lastSelectedRef.current = hoveredIndex;
      }
    },
    [isTracing, isDisabled, currentPath, gridSize, addToPath, removeLastFromPath, play, vibrate]
  );

  return (
    <div className="relative">
      {/* Current word display */}
      <div className="h-10 mb-3 flex items-center justify-center">
        <span className="text-2xl font-bold text-accent tracking-wider">
          {currentWord}
        </span>
      </div>

      {/* Grid container */}
      <div className={`relative ${isSpectator ? 'opacity-75' : ''}`}>
        {/* Grid */}
        <div
          ref={gridRef}
          className="grid gap-2 touch-none relative z-[1]"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {grid.map((letter, index) => (
            <Cell
              key={index}
              letter={letter}
              index={index}
              isSelected={currentPath.includes(index)}
              selectionOrder={currentPath.indexOf(index)}
              isDisabled={isDisabled}
              onPointerDown={handlePointerDown}
            />
          ))}
        </div>

        {/* Spectator mode indicator */}
        {isSpectator && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-bg-main/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-accent/50 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="text-accent font-semibold text-sm uppercase tracking-wide">
                Watching
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
