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
 * Get points for a word (length - 2, minimum 1)
 * 3 letters = 1pt, 4 letters = 2pt, 5 letters = 3pt, etc.
 */
export function getWordPoints(word: string): number {
  return Math.max(1, word.length - 2);
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

/**
 * Find a path for a word in the grid using DFS
 * Returns the first valid path found, or null if word not in grid
 */
export function findWordPath(grid: string[], word: string, gridSize: number = 5): number[] | null {
  const totalCells = gridSize * gridSize;

  // Try starting from each cell
  for (let startIdx = 0; startIdx < totalCells; startIdx++) {
    const result = findWordPathDFS(grid, word, gridSize, startIdx, [], 0);
    if (result) return result;
  }

  return null;
}

function findWordPathDFS(
  grid: string[],
  word: string,
  gridSize: number,
  currentIdx: number,
  path: number[],
  wordPos: number
): number[] | null {
  // Check if current cell matches expected letter(s)
  const cell = grid[currentIdx];
  const remaining = word.slice(wordPos);

  if (!remaining.startsWith(cell)) {
    return null;
  }

  const newPath = [...path, currentIdx];
  const newWordPos = wordPos + cell.length;

  // Word complete
  if (newWordPos === word.length) {
    return newPath;
  }

  // Find adjacent cells to continue
  const row = Math.floor(currentIdx / gridSize);
  const col = currentIdx % gridSize;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;

      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) continue;

      const nextIdx = newRow * gridSize + newCol;

      // Skip if already in path
      if (newPath.includes(nextIdx)) continue;

      const result = findWordPathDFS(grid, word, gridSize, nextIdx, newPath, newWordPos);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Generate a grid that contains specific words
 * Places words in the grid and fills remaining cells with random letters
 */
export function generateGridWithWords(words: string[], gridSize: number = 5): { grid: string[]; wordPaths: Map<string, number[]> } {
  const totalCells = gridSize * gridSize;
  const grid: (string | null)[] = new Array(totalCells).fill(null);
  const wordPaths = new Map<string, number[]>();

  // Sort words by length (longest first for better placement)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    const path = tryPlaceWord(grid, word, gridSize);
    if (path) {
      wordPaths.set(word, path);
    }
  }

  // Fill remaining cells with random letters
  const vowels = 'AEIOU';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';

  for (let i = 0; i < totalCells; i++) {
    if (grid[i] === null) {
      // Mix of vowels and consonants
      const useVowel = Math.random() < 0.35;
      const chars = useVowel ? vowels : consonants;
      grid[i] = chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return { grid: grid as string[], wordPaths };
}

function tryPlaceWord(grid: (string | null)[], word: string, gridSize: number): number[] | null {
  const totalCells = gridSize * gridSize;

  // Try multiple random starting positions
  const attempts = 50;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const startIdx = Math.floor(Math.random() * totalCells);
    const path = tryPlaceWordFrom(grid, word, gridSize, startIdx, [], 0);
    if (path) {
      // Place the word in the grid
      let wordPos = 0;
      for (const idx of path) {
        const letter = word[wordPos];
        grid[idx] = letter;
        wordPos++;
      }
      return path;
    }
  }

  return null;
}

function tryPlaceWordFrom(
  grid: (string | null)[],
  word: string,
  gridSize: number,
  currentIdx: number,
  path: number[],
  wordPos: number
): number[] | null {
  // Check if cell is available or already has the right letter
  const cell = grid[currentIdx];
  const letter = word[wordPos];

  if (cell !== null && cell !== letter) {
    return null;
  }

  const newPath = [...path, currentIdx];
  const newWordPos = wordPos + 1;

  // Word complete
  if (newWordPos === word.length) {
    return newPath;
  }

  // Find adjacent cells to continue (randomize order for variety)
  const row = Math.floor(currentIdx / gridSize);
  const col = currentIdx % gridSize;
  const neighbors: number[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;

      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) continue;

      const nextIdx = newRow * gridSize + newCol;
      if (!newPath.includes(nextIdx)) {
        neighbors.push(nextIdx);
      }
    }
  }

  // Shuffle neighbors
  neighbors.sort(() => Math.random() - 0.5);

  for (const nextIdx of neighbors) {
    const result = tryPlaceWordFrom(grid, word, gridSize, nextIdx, newPath, newWordPos);
    if (result) return result;
  }

  return null;
}

/**
 * Prepare words for animated reveal sequence
 * Order: Shared words first (2+ players), then unique (1 player)
 * Within each category: shortest to longest, then alphabetically
 */
export function prepareWordRevealSequence(
  foundWords: Record<string, string[]>
): { word: string; points: number; foundByPlayerIds: string[]; isShared: boolean }[] {
  // Build word -> playerIds map
  const wordToPlayers = new Map<string, string[]>();

  Object.entries(foundWords).forEach(([playerId, words]) => {
    words.forEach((word) => {
      const existing = wordToPlayers.get(word) || [];
      existing.push(playerId);
      wordToPlayers.set(word, existing);
    });
  });

  // Convert to array with metadata
  const allWords: { word: string; points: number; foundByPlayerIds: string[]; isShared: boolean }[] = [];

  wordToPlayers.forEach((playerIds, word) => {
    const basePoints = getWordPoints(word);
    const isShared = playerIds.length >= 2;
    // Unique words (found by only one player) get 2x points
    const points = isShared ? basePoints : basePoints * 2;
    allWords.push({
      word,
      points,
      foundByPlayerIds: playerIds,
      isShared,
    });
  });

  // Sort: length ascending, then alphabetically
  const sortFn = (a: typeof allWords[0], b: typeof allWords[0]) => {
    const lenDiff = a.word.length - b.word.length;
    if (lenDiff !== 0) return lenDiff;
    return a.word.localeCompare(b.word);
  };

  // Separate, sort, and concatenate
  const shared = allWords.filter((w) => w.isShared).sort(sortFn);
  const unique = allWords.filter((w) => !w.isShared).sort(sortFn);

  return [...shared, ...unique];
}
