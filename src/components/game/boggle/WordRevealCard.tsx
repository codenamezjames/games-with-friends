interface WordRevealCardProps {
  word: string;
  points: number;
  isShared: boolean;
  playerNames: string[];
  animationKey: number;
}

export function WordRevealCard({
  word,
  points,
  isShared,
  playerNames,
  animationKey,
}: WordRevealCardProps) {
  return (
    <div
      key={animationKey}
      className="word-reveal flex flex-col items-center justify-center py-6"
    >
      {/* Shared indicator */}
      {isShared && (
        <div className="text-accent text-sm font-medium mb-2">
          Shared Word
        </div>
      )}

      {/* The word */}
      <div className="text-4xl font-bold text-text-primary tracking-wider mb-2">
        {word}
      </div>

      {/* Points badge */}
      <div className="bg-primary/20 text-primary px-4 py-1 rounded-full text-lg font-semibold mb-4">
        +{points} {points === 1 ? 'point' : 'points'}
      </div>

      {/* Players who found it */}
      <div className="text-text-secondary text-sm">
        Found by:{' '}
        <span className="text-text-primary font-medium">
          {playerNames.join(', ')}
        </span>
      </div>
    </div>
  );
}
