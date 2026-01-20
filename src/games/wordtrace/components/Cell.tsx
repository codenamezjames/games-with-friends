interface CellProps {
  letter: string;
  index: number;
  isSelected: boolean;
  selectionOrder?: number;
  isDisabled: boolean;
  onPointerDown: (index: number) => void;
}

export function Cell({
  letter,
  index,
  isSelected,
  selectionOrder,
  isDisabled,
  onPointerDown,
}: CellProps) {
  const displayLetter = letter === 'QU' ? 'Qu' : letter;
  const isQu = letter === 'QU';

  return (
    <div
      data-index={index}
      className={`
        relative aspect-square flex items-center justify-center
        rounded-lg text-2xl font-bold select-none
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${
          isSelected
            ? 'bg-primary text-white tile-selected tile-selected-glow z-10'
            : 'bg-bg-cell text-text-primary hover:bg-bg-cell-hover transition-colors duration-150'
        }
        ${isQu ? 'text-xl' : ''}
      `}
      onPointerDown={() => !isDisabled && onPointerDown(index)}
    >
      {displayLetter}
      {isSelected && selectionOrder !== undefined && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-bg-main text-xs font-bold rounded-full flex items-center justify-center">
          {selectionOrder + 1}
        </span>
      )}
    </div>
  );
}
