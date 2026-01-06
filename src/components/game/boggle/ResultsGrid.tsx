import { useMemo } from 'react';

interface ResultsGridProps {
  grid: string[];
  gridSize: number;
  highlightedPath: number[];
}

export function ResultsGrid({ grid, gridSize, highlightedPath }: ResultsGridProps) {
  // Create a set for O(1) lookup and track order for gradient
  const pathSet = useMemo(() => new Set(highlightedPath), [highlightedPath]);
  const pathOrder = useMemo(() => {
    const order = new Map<number, number>();
    highlightedPath.forEach((idx, i) => order.set(idx, i));
    return order;
  }, [highlightedPath]);

  return (
    <div
      className="grid gap-1 w-full max-w-xs mx-auto"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      }}
    >
      {grid.map((letter, index) => {
        const isHighlighted = pathSet.has(index);
        const order = pathOrder.get(index);
        const isFirst = order === 0;
        const isLast = order === highlightedPath.length - 1;

        return (
          <div
            key={index}
            className={`
              aspect-square flex items-center justify-center
              rounded-lg font-bold text-lg md:text-xl
              transition-all duration-300
              ${isHighlighted
                ? 'bg-primary text-bg-main scale-110 shadow-lg shadow-primary/50 ring-2 ring-primary'
                : 'bg-bg-cell/50 text-text-muted'
              }
              ${isFirst ? 'ring-4 ring-success' : ''}
              ${isLast && highlightedPath.length > 1 ? 'ring-4 ring-accent' : ''}
            `}
            style={{
              animationDelay: isHighlighted ? `${(order || 0) * 50}ms` : '0ms',
            }}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}
