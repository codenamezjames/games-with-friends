interface SpectatorBannerProps {
  timeRemaining: number;
}

export function SpectatorBanner({ timeRemaining }: SpectatorBannerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="bg-accent/20 border border-accent rounded-lg p-4 mb-4">
      <div className="flex items-center justify-center gap-2 text-accent font-semibold mb-1">
        <svg
          className="w-5 h-5"
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
        <span className="text-lg">Spectating</span>
      </div>
      <p className="text-sm text-text-muted text-center">
        Watch the game and play along in your head!
      </p>
      <p className="text-sm text-text-secondary text-center mt-2">
        You'll join when the next round starts
        {timeRemaining > 0 && (
          <span className="text-accent ml-1">
            ({minutes}:{seconds.toString().padStart(2, '0')} remaining)
          </span>
        )}
      </p>
    </div>
  );
}
