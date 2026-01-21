import { useReactionsStore } from '@/stores/useReactionsStore';
import { FloatingEmoji } from './FloatingEmoji';

export function ReactionsOverlay() {
  const { activeReactions } = useReactionsStore();

  if (activeReactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {activeReactions.map((reaction) => (
        <FloatingEmoji key={reaction.id} reaction={reaction} />
      ))}
    </div>
  );
}
