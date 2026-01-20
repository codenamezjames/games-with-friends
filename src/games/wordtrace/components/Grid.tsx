import { useCallback, useRef, useMemo, useEffect } from 'react';
import { Cell } from './Cell';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameStore } from '@/stores/useGameStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { isAdjacent, getWordFromPath } from '@/games/wordtrace/utils';

interface GridProps {
  onWordSubmit: (word: string, path: number[]) => void;
  disabled?: boolean;
  isSpectator?: boolean;
}

const CELL_GAP = 8; // gap-2 = 0.5rem = 8px

function getCellCenter(index: number, cellSize: number, gridSize: number): { x: number; y: number } {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const x = col * (cellSize + CELL_GAP) + cellSize / 2;
  const y = row * (cellSize + CELL_GAP) + cellSize / 2;
  return { x, y };
}

// Find the closest adjacent cell to the pointer position
function findClosestAdjacentCell(
  fromIndex: number,
  pointerX: number,
  pointerY: number,
  gridSize: number,
  cellSize: number,
  gridRect: DOMRect,
  currentPath: number[]
): number | null {
  const fromRow = Math.floor(fromIndex / gridSize);
  const fromCol = fromIndex % gridSize;

  // Convert pointer position to grid-relative coordinates
  const relX = pointerX - gridRect.left;
  const relY = pointerY - gridRect.top;

  // Find the closest adjacent cell
  let closestIndex: number | null = null;
  let closestDistance = Infinity;

  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;

      const newRow = fromRow + dRow;
      const newCol = fromCol + dCol;

      if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
        const index = newRow * gridSize + newCol;

        // Skip cells already in path
        if (currentPath.includes(index)) continue;

        // Calculate cell center position
        const cellCenter = getCellCenter(index, cellSize, gridSize);

        // Calculate distance from pointer to cell center
        const dx = relX - cellCenter.x;
        const dy = relY - cellCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Selection threshold - must be within 35% of cell size from center
        const threshold = cellSize * 0.35;

        if (distance < threshold && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    }
  }

  return closestIndex;
}

export function Grid({ onWordSubmit, disabled = false, isSpectator = false }: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
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
  const { play } = useSoundEffects();
  const { vibrate } = useHaptics();

  const isDisabled = phase !== 'playing' || disabled;

  // Calculate cell size based on grid size (smaller cells for larger grids)
  // Must be before callbacks that use it
  const cellSize = useMemo(() => {
    if (gridSize === 4) return 70;
    if (gridSize === 5) return 60;
    return 50; // 6x6
  }, [gridSize]);

  const handlePointerDown = useCallback(
    (index: number) => {
      if (isDisabled) return;
      play('tileSelect');
      vibrate('tileSelect');
      startTrace(index);
    },
    [isDisabled, startTrace, play, vibrate]
  );

  // Track last selected cell to avoid duplicate processing
  const lastSelectedRef = useRef<number | null>(null);

  const handleCellEnter = useCallback(
    (index: number) => {
      if (!isTracing || isDisabled) return;

      // Backtracking - if we enter a cell that's second-to-last in path, remove last
      if (currentPath.length >= 2 && currentPath[currentPath.length - 2] === index) {
        removeLastFromPath();
        lastSelectedRef.current = index;
        return;
      }

      // Don't add if already in path
      if (currentPath.includes(index)) return;

      // Check adjacency with last cell
      const lastIndex = currentPath[currentPath.length - 1];

      if (isAdjacent(lastIndex, index, gridSize)) {
        play('tileSelect');
        vibrate('tileSelect');
        addToPath(index);
        lastSelectedRef.current = index;
      }
    },
    [isTracing, isDisabled, currentPath, removeLastFromPath, addToPath, play, vibrate, gridSize]
  );

  // Handle pointer move for touch dragging - uses proximity-based selection
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isTracing || isDisabled || !gridRef.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const lastIndex = currentPath[currentPath.length - 1];

      // Check for backtracking first - if pointer is near the second-to-last cell
      if (currentPath.length >= 2) {
        const secondLastIndex = currentPath[currentPath.length - 2];
        const secondLastCenter = getCellCenter(secondLastIndex, cellSize, gridSize);
        const relX = e.clientX - gridRect.left;
        const relY = e.clientY - gridRect.top;
        const dx = relX - secondLastCenter.x;
        const dy = relY - secondLastCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < cellSize * 0.35) {
          if (lastSelectedRef.current !== secondLastIndex) {
            removeLastFromPath();
            lastSelectedRef.current = secondLastIndex;
          }
          return;
        }
      }

      // Find the closest adjacent cell to select
      const closestIndex = findClosestAdjacentCell(
        lastIndex,
        e.clientX,
        e.clientY,
        gridSize,
        cellSize,
        gridRect,
        currentPath
      );

      if (closestIndex !== null && closestIndex !== lastSelectedRef.current) {
        play('tileSelect');
        vibrate('tileSelect');
        addToPath(closestIndex);
        lastSelectedRef.current = closestIndex;
      }
    },
    [isTracing, isDisabled, currentPath, cellSize, gridSize, removeLastFromPath, addToPath, play, vibrate]
  );

  // Reset refs when trace ends
  useEffect(() => {
    if (!isTracing) {
      lastSelectedRef.current = null;
    }
  }, [isTracing]);

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

  // Calculate path lines for SVG overlay
  const pathLines = useMemo(() => {
    if (currentPath.length < 2) return [];

    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
    for (let i = 0; i < currentPath.length - 1; i++) {
      const from = getCellCenter(currentPath[i], cellSize, gridSize);
      const to = getCellCenter(currentPath[i + 1], cellSize, gridSize);
      lines.push({
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        key: `${currentPath[i]}-${currentPath[i + 1]}`,
      });
    }
    return lines;
  }, [currentPath, cellSize, gridSize]);

  // Calculate SVG dimensions
  const svgSize = useMemo(() => {
    const totalSize = gridSize * cellSize + (gridSize - 1) * CELL_GAP;
    return totalSize;
  }, [gridSize, cellSize]);

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
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            preserveAspectRatio="xMidYMid meet"
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
                className="path-line"
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
              onPointerEnter={handleCellEnter}
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
