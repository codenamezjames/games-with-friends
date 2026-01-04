// Boggle dice (36 dice to support up to 6x6 grid)
export const DICE = [
  // Original 25 dice for 5x5
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS', 'AOOTTW',
  'CIMOTU', 'DEILRX', 'DELRVY', 'DISTTY', 'EEGHNW',
  'EEINSU', 'EHRTVW', 'EIOSST', 'ELRTTY', 'HIMNUQ',
  'HLNNRZ', 'AACIOT', 'ABILTY', 'ABJMOQ', 'ACDEMP',
  'ACELRS', 'ADENVZ', 'BIFORX', 'DENOSW', 'DKNOTU',
  // Additional 11 dice for 6x6 support
  'AEILMN', 'AEIOUY', 'BCDFGK', 'CGHIJL', 'EGKLUY',
  'FHIPRS', 'GJMNOP', 'LNPRST', 'MNOQUV', 'OPRSTW',
  'RSTUVW',
];

/**
 * Check if two cell indices are adjacent in the grid
 */
export function isAdjacent(index1: number, index2: number, gridSize: number = 5): boolean {
  const row1 = Math.floor(index1 / gridSize);
  const col1 = index1 % gridSize;
  const row2 = Math.floor(index2 / gridSize);
  const col2 = index2 % gridSize;

  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);

  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

/**
 * Get points for a word (official Boggle scoring)
 */
export function getWordPoints(word: string): number {
  const len = word.length;
  if (len <= 4) return 1;
  if (len === 5) return 2;
  if (len === 6) return 3;
  if (len === 7) return 5;
  return 11; // 8+ letters
}

/**
 * Validate that a path is valid (no duplicates, all adjacent)
 */
export function isValidPath(path: number[], gridSize: number = 5): boolean {
  if (!path || path.length === 0) return false;

  const totalCells = gridSize * gridSize;

  // Check for duplicates
  if (new Set(path).size !== path.length) return false;

  // Check all indices are valid
  for (const idx of path) {
    if (idx < 0 || idx >= totalCells) return false;
  }

  // Check adjacency
  for (let i = 1; i < path.length; i++) {
    if (!isAdjacent(path[i - 1], path[i], gridSize)) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a letter grid using Boggle dice
 */
export function generateGrid(gridSize: number = 5): string[] {
  const totalCells = gridSize * gridSize;
  const shuffledDice = [...DICE].sort(() => Math.random() - 0.5);

  return shuffledDice.slice(0, totalCells).map((die) => {
    const faceIndex = Math.floor(Math.random() * 6);
    const letter = die[faceIndex];
    return letter === 'Q' ? 'QU' : letter;
  });
}

/**
 * Get the word formed by a path through the grid
 */
export function getWordFromPath(grid: string[], path: number[]): string {
  return path.map((i) => grid[i]).join('');
}
