// Word Trace - Dictionary
// Base dictionary with common words, extended dictionary loaded from web

export const DICTIONARY: Set<string> = new Set([]);

// Load extended dictionary from the web
export async function loadExtendedDictionary(): Promise<void> {
  try {
    // Using a popular open-source word list
    const response = await fetch(
      'https://raw.githubusercontent.com/raun/Scrabble/refs/heads/master/words.txt'
    );
    if (!response.ok) throw new Error('Failed to fetch dictionary');

    const text = await response.text();
    const words = text
      .split('\n')
      .map((w) => w.trim().toUpperCase())
      .filter((w) => w.length >= 3 && w.length <= 10); // 3-10 letter words

    // Add all words to dictionary
    words.forEach((word) => DICTIONARY.add(word));
    console.log(`Dictionary loaded: ${DICTIONARY.size} words`);
  } catch (error) {
    console.warn(
      'Could not load extended dictionary, using base dictionary:',
      error
    );
  }
}

// Start loading dictionary immediately
loadExtendedDictionary();
