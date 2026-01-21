import { useState } from 'react';
import type { Reaction } from '@/types';

interface FloatingEmojiProps {
  reaction: Reaction;
}

export function FloatingEmoji({ reaction }: FloatingEmojiProps) {
  // Randomize horizontal position (10-90% from left)
  // Using useState lazy initializer to compute once at mount
  const [left] = useState(() => 10 + Math.random() * 80);

  return (
    <div
      className="emoji-float"
      style={{
        left: `${left}%`,
      }}
    >
      <span className="text-4xl">{reaction.emoji}</span>
    </div>
  );
}
