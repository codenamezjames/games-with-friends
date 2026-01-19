interface SpectatorBannerProps {
  timeRemaining: number;
}

export function SpectatorBanner({ timeRemaining }: SpectatorBannerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="bg-gradient-to-r from-accent/30 via-accent/20 to-accent/30 border-2 border-accent rounded-xl p-4 mb-4 shadow-lg relative overflow-hidden">
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

      <div className="relative">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Larger eye icon with glow */}
          <div className="relative">
            <svg
              className="w-8 h-8 text-accent drop-shadow-lg"
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
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-accent/30 rounded-full blur-md animate-pulse" />
          </div>
          <span className="text-xl font-bold text-accent uppercase tracking-wider">
            Spectator Mode
          </span>
        </div>

        <p className="text-sm text-text-primary text-center font-medium">
          Watching the action live
        </p>

        <div className="flex items-center justify-center gap-2 mt-3 text-sm">
          <div className="flex items-center gap-1.5 bg-bg-main/50 px-3 py-1 rounded-full">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-text-secondary">
              Join next round in{' '}
              <span className="text-accent font-bold">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
