import { useCallback, useRef, useMemo, useEffect } from 'react';
import { Cell } from './Cell';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameStore } from '@/stores/useGameStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { isAdjacent, getWordFromPath } from '@/games/wordtrace/utils';

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

// Calculate angle difference between two angles (handles wrap-around)
function getAngleDiff(angle1: number, angle2: number): number {
  let diff = Math.abs(angle1 - angle2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}

// Find the best adjacent cell based on movement direction
function findBestAdjacentCell(
  fromIndex: number,
  targetIndex: number,
  movementAngle: number | null,
  gridSize: number,
  currentPath: number[]
): number | null {
  // If no movement angle data, accept the target if it's adjacent
  if (movementAngle === null) return targetIndex;

  const fromRow = Math.floor(fromIndex / gridSize);
  const fromCol = fromIndex % gridSize;

  // Get all 8 adjacent cells
  const adjacentCells: Array<{ index: number; angle: number; isDiagonal: boolean }> = [];
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      const newRow = fromRow + dRow;
      const newCol = fromCol + dCol;
      if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
        const index = newRow * gridSize + newCol;
        // Skip cells already in path
        if (currentPath.includes(index)) continue;
        const angle = Math.atan2(dRow, dCol);
        const isDiagonal = dRow !== 0 && dCol !== 0;
        adjacentCells.push({ index, angle, isDiagonal });
      }
    }
  }

  if (adjacentCells.length === 0) return null;

  // Find the cell with the smallest angle difference to movement direction
  let bestCell = adjacentCells[0];
  let bestAngleDiff = getAngleDiff(bestCell.angle, movementAngle);

  for (const cell of adjacentCells) {
    const angleDiff = getAngleDiff(cell.angle, movementAngle);
    // Prefer this cell if it has a smaller angle difference,
    // OR if angle difference is similar but this cell is what the user touched
    if (angleDiff < bestAngleDiff - 0.1 || (Math.abs(angleDiff - bestAngleDiff) < 0.2 && cell.index === targetIndex)) {
      bestCell = cell;
      bestAngleDiff = angleDiff;
    }
  }

  // Only return the best cell if it's reasonably aligned (within 45 degrees)
  if (bestAngleDiff < Math.PI / 4) {
    return bestCell.index;
  }

  // Fall back to target if it's adjacent and within a looser threshold
  const targetRow = Math.floor(targetIndex / gridSize);
  const targetCol = targetIndex % gridSize;
  const targetAngle = Math.atan2(targetRow - fromRow, targetCol - fromCol);
  const targetAngleDiff = getAngleDiff(targetAngle, movementAngle);

  if (targetAngleDiff < Math.PI / 2 && !currentPath.includes(targetIndex)) {
    return targetIndex;
  }

  return null;
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

      // When using movement filter (touch drag), find the best cell based on movement direction
      if (useMovementFilter && movementAngleRef.current !== null) {
        const bestIndex = findBestAdjacentCell(lastIndex, index, movementAngleRef.current, gridSize, currentPath);
        if (bestIndex !== null && !currentPath.includes(bestIndex)) {
          play('tileSelect');
          addToPath(bestIndex);
        }
        return;
      }

      // Normal adjacency check for mouse hover
      if (isAdjacent(lastIndex, index, gridSize)) {
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
