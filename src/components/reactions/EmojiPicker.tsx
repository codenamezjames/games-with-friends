import { useState, useRef, useEffect } from 'react';
import { useReactions } from '@/hooks/useReactions';
import { REACTION_EMOJIS } from './constants';

export function EmojiPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { sendReaction } = useReactions();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleEmojiClick = async (emoji: string) => {
    await sendReaction(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-bg-cell hover:bg-bg-cell-hover transition-colors text-xl"
        title="Send reaction"
      >
        <span role="img" aria-label="React">😀</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-bg-card rounded-lg shadow-xl p-2 flex gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="p-2 text-2xl hover:bg-bg-cell-hover rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
