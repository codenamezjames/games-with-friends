interface GameCardProps {
  icon: string;
  name: string;
  description: string;
  players: string;
  duration: string;
  available: boolean;
  onClick?: () => void;
}

export function GameCard({
  icon,
  name,
  description,
  players,
  duration,
  available,
  onClick,
}: GameCardProps) {
  return (
    <div
      className={`
        bg-bg-card rounded-[var(--radius-default)] p-8 flex gap-5 items-start
        transition-all duration-200 border-2 border-transparent
        ${
          available
            ? 'cursor-pointer hover:border-primary hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)]'
            : 'opacity-50 cursor-not-allowed'
        }
      `}
      onClick={available ? onClick : undefined}
    >
      <span className="text-5xl shrink-0">{icon}</span>

      <div className="flex-1">
        <h3 className="text-xl text-text-primary mb-2 flex items-center gap-2.5 flex-wrap">
          {name}
          {!available && (
            <span className="text-[0.7rem] bg-text-muted text-bg-main px-2 py-0.5 rounded uppercase font-semibold tracking-wider">
              Coming Soon
            </span>
          )}
        </h3>

        <p className="text-text-secondary text-[0.95rem] leading-relaxed mb-4">
          {description}
        </p>

        <div className="flex gap-4">
          <span className="text-text-muted text-sm">{players}</span>
          <span className="text-text-muted text-sm">{duration}</span>
        </div>
      </div>
    </div>
  );
}
