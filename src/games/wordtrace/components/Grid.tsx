import { useCallback, useRef, useEffect, useState } from 'react';
import { Cell } from './Cell';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameStore } from '@/stores/useGameStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { getWordFromPath } from '@/games/wordtrace/utils';

interface PathLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  key: string;
}

// Selection tuning constants
const INNER_HITBOX_RATIO = 0.75; // Only select when pointer is within inner 75% of cell
const DWELL_TIME_MS = 10; // Must hover for 10ms before selecting

interface CellAtPoint {
  index: number;
  element: Element;
}

/**
 * Get the cell index and element at a given screen coordinate using browser hit testing.
 * Returns null if no cell is found at the position.
 */
function getCellAtPoint(x: number, y: number): CellAtPoint | null {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  // Walk up to find element with data-index (in case we hit a child)
  const cell = element.closest('[data-index]');
  if (!cell) return null;

  const index = cell.getAttribute('data-index');
  if (index === null) return null;

  return { index: parseInt(index, 10), element: cell };
}

/**
 * Check if a pointer position is within the inner region of a cell.
 * Returns true if pointer is within the inner INNER_HITBOX_RATIO of the cell.
 */
function isPointerInInnerRegion(pointerX: number, pointerY: number, cellElement: Element): boolean {
  const rect = cellElement.getBoundingClientRect();
  const marginX = rect.width * (1 - INNER_HITBOX_RATIO) / 2;
  const marginY = rect.height * (1 - INNER_HITBOX_RATIO) / 2;

  const innerLeft = rect.left + marginX;
  const innerRight = rect.right - marginX;
  const innerTop = rect.top + marginY;
  const innerBottom = rect.bottom - marginY;

  return pointerX >= innerLeft && pointerX <= innerRight &&
         pointerY >= innerTop && pointerY <= innerBottom;
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
  const gridRef = useRef<HTMLDivElement>(null);
  const [pathLines, setPathLines] = useState<PathLine[]>([]);

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

  // Track pending selection with dwell time
  const pendingSelectionRef = useRef<{
    cellIndex: number;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Clear pending selection helper
  const clearPendingSelection = useCallback(() => {
    if (pendingSelectionRef.current) {
      clearTimeout(pendingSelectionRef.current.timeoutId);
      pendingSelectionRef.current = null;
    }
  }, []);

  // Reset refs when trace ends
  useEffect(() => {
    if (!isTracing) {
      lastSelectedRef.current = null;
      clearPendingSelection();
    }
  }, [isTracing, clearPendingSelection]);

  // Calculate path lines for SVG overlay
  useEffect(() => {
    if (currentPath.length < 2 || !gridRef.current) {
      setPathLines([]);
      return;
    }

    const gridRect = gridRef.current.getBoundingClientRect();
    const lines: PathLine[] = [];

    for (let i = 0; i < currentPath.length - 1; i++) {
      const fromCell = gridRef.current.querySelector(`[data-index="${currentPath[i]}"]`);
      const toCell = gridRef.current.querySelector(`[data-index="${currentPath[i + 1]}"]`);

      if (fromCell && toCell) {
        const fromRect = fromCell.getBoundingClientRect();
        const toRect = toCell.getBoundingClientRect();

        // Calculate centers relative to grid
        const x1 = fromRect.left + fromRect.width / 2 - gridRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - gridRect.top;
        const x2 = toRect.left + toRect.width / 2 - gridRect.left;
        const y2 = toRect.top + toRect.height / 2 - gridRect.top;

        lines.push({ x1, y1, x2, y2, key: `${currentPath[i]}-${currentPath[i + 1]}` });
      }
    }

    setPathLines(lines);
  }, [currentPath]);

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

  // Handle drag selection using browser hit testing with inner hitbox and dwell time
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isTracing || isDisabled) return;

      const cellAtPoint = getCellAtPoint(e.clientX, e.clientY);
      if (!cellAtPoint) {
        clearPendingSelection();
        return;
      }

      const { index: hoveredIndex, element: cellElement } = cellAtPoint;

      // Check if pointer is within the inner region of the cell
      const inInnerRegion = isPointerInInnerRegion(e.clientX, e.clientY, cellElement);
      if (!inInnerRegion) {
        // Left the inner region - clear any pending selection for this cell
        if (pendingSelectionRef.current?.cellIndex === hoveredIndex) {
          clearPendingSelection();
        }
        return;
      }

      // Skip if same as last selected
      if (hoveredIndex === lastSelectedRef.current) return;

      const lastIndex = currentPath[currentPath.length - 1];

      // Backtracking: if hovering second-to-last cell, remove last (immediate, no dwell)
      if (currentPath.length >= 2 && hoveredIndex === currentPath[currentPath.length - 2]) {
        clearPendingSelection();
        removeLastFromPath();
        lastSelectedRef.current = hoveredIndex;
        return;
      }

      // Skip if already in path
      if (currentPath.includes(hoveredIndex)) return;

      // Only consider if adjacent to last cell
      if (!isAdjacent(lastIndex, hoveredIndex, gridSize)) return;

      // If already pending for this cell, let the timeout handle it
      if (pendingSelectionRef.current?.cellIndex === hoveredIndex) return;

      // Clear any pending selection for a different cell
      clearPendingSelection();

      // Start dwell timer for this cell
      const timeoutId = setTimeout(() => {
        // Double-check conditions are still valid when timeout fires
        if (lastSelectedRef.current !== hoveredIndex && !currentPath.includes(hoveredIndex)) {
          play('tileSelect');
          vibrate('tileSelect');
          addToPath(hoveredIndex);
          lastSelectedRef.current = hoveredIndex;
        }
        pendingSelectionRef.current = null;
      }, DWELL_TIME_MS);

      pendingSelectionRef.current = { cellIndex: hoveredIndex, timeoutId };
    },
    [isTracing, isDisabled, currentPath, gridSize, addToPath, removeLastFromPath, play, vibrate, clearPendingSelection]
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
        {/* SVG overlay for path lines */}
        {pathLines.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: '100%', height: '100%' }}
          >
            {pathLines.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(244, 185, 66, 0.8)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

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
