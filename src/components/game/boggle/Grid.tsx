import { useCallback, useRef, useMemo, useEffect } from 'react';
import { Cell } from './Cell';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameStore } from '@/stores/useGameStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { isAdjacent, getWordFromPath } from '@/games/boggle/utils';

interface GridProps {
  onWordSubmit: (word: string, path: number[]) => void;
  disabled?: boolean;
}

const CELL_GAP = 8; // gap-2 = 0.5rem = 8px

function getCellCenter(index: number, cellSize: number, gridSize: number): { x: number; y: number } {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const x = col * (cellSize + CELL_GAP) + cellSize / 2;
  const y = row * (cellSize + CELL_GAP) + cellSize / 2;
  return { x, y };
}

// Check if movement direction favors this cell over orthogonal alternatives
function isDiagonallyAligned(
  fromIndex: number,
  toIndex: number,
  movementAngle: number | null,
  gridSize: number
): boolean {
  if (movementAngle === null) return true; // No movement data, accept any adjacent cell

  const fromRow = Math.floor(fromIndex / gridSize);
  const fromCol = fromIndex % gridSize;
  const toRow = Math.floor(toIndex / gridSize);
  const toCol = toIndex % gridSize;

  const dRow = toRow - fromRow;
  const dCol = toCol - fromCol;

  // Calculate angle from current cell to target cell
  // atan2 gives angle in radians, 0 = right, positive = down
  const cellAngle = Math.atan2(dRow, dCol);

  // Calculate angle difference (handle wrap-around)
  let angleDiff = Math.abs(cellAngle - movementAngle);
  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

  // Accept if cell is within 60 degrees of movement direction
  // This allows some tolerance while still filtering out cells clearly off-path
  return angleDiff < Math.PI / 3;
}

export function Grid({ onWordSubmit, disabled = false }: GridProps) {
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

  const isDisabled = phase !== 'playing' || disabled;

  const handlePointerDown = useCallback(
    (index: number) => {
      if (isDisabled) return;
      play('tileSelect');
      startTrace(index);
    },
    [isDisabled, startTrace, play]
  );

  // Track last cell to avoid duplicate processing
  const lastCellRef = useRef<number | null>(null);

  // Track pointer positions for movement direction calculation
  const pointerHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const movementAngleRef = useRef<number | null>(null);

  const handleCellEnter = useCallback(
    (index: number, useMovementFilter: boolean = false) => {
      if (!isTracing || isDisabled) return;

      // Backtracking - if we enter a cell that's second-to-last in path, remove last
      if (currentPath.length >= 2 && currentPath[currentPath.length - 2] === index) {
        removeLastFromPath();
        return;
      }

      // Don't add if already in path
      if (currentPath.includes(index)) return;

      // Check adjacency with last cell
      const lastIndex = currentPath[currentPath.length - 1];
      if (isAdjacent(lastIndex, index, gridSize)) {
        // When using movement filter (touch drag), check if cell aligns with movement direction
        if (useMovementFilter && movementAngleRef.current !== null) {
          if (!isDiagonallyAligned(lastIndex, index, movementAngleRef.current, gridSize)) {
            return; // Skip this cell - it's not in our movement direction
          }
        }
        play('tileSelect');
        addToPath(index);
      }
    },
    [isTracing, isDisabled, currentPath, removeLastFromPath, addToPath, play, gridSize]
  );

  // Handle pointer move for touch dragging (pointerenter doesn't fire during touch drag)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isTracing || isDisabled) return;

      const now = Date.now();
      const pos = { x: e.clientX, y: e.clientY, time: now };

      // Add to history and keep only recent positions (last 100ms)
      pointerHistoryRef.current.push(pos);
      pointerHistoryRef.current = pointerHistoryRef.current.filter(p => now - p.time < 100);

      // Calculate movement angle from oldest to newest position
      if (pointerHistoryRef.current.length >= 2) {
        const oldest = pointerHistoryRef.current[0];
        const newest = pointerHistoryRef.current[pointerHistoryRef.current.length - 1];
        const dx = newest.x - oldest.x;
        const dy = newest.y - oldest.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only update angle if we've moved enough to determine direction
        if (distance > 10) {
          movementAngleRef.current = Math.atan2(dy, dx);
        }
      }

      // Get the element under the pointer
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element) return;

      // Find the cell element (might be the element itself or a parent)
      const cellElement = element.closest('[data-index]');
      if (!cellElement) return;

      const index = parseInt(cellElement.getAttribute('data-index') || '', 10);
      if (isNaN(index)) return;

      // Only process if we've moved to a new cell
      if (index === lastCellRef.current) return;
      lastCellRef.current = index;

      // Use movement filter for touch/drag to improve diagonal selection
      handleCellEnter(index, true);
    },
    [isTracing, isDisabled, handleCellEnter]
  );

  // Reset refs when trace ends
  useEffect(() => {
    if (!isTracing) {
      lastCellRef.current = null;
      pointerHistoryRef.current = [];
      movementAngleRef.current = null;
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

  // Calculate cell size based on grid size (smaller cells for larger grids)
  const cellSize = useMemo(() => {
    if (gridSize === 4) return 70;
    if (gridSize === 5) return 60;
    return 50; // 6x6
  }, [gridSize]);

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
      <div className="relative">
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
      </div>
    </div>
  );
}
