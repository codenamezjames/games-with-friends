import { useEffect, useState } from 'react';
import { useAchievementsStore, ACHIEVEMENTS } from '@/stores/useAchievementsStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';

interface NotificationData {
  id: string;
  name: string;
  emoji: string;
}

export function AchievementNotification() {
  const { consumeNotification } = useAchievementsStore();
  const { play: playSound } = useSoundEffects();
  const { vibrate } = useHaptics();

  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Poll for new notifications every 500ms
    const interval = setInterval(() => {
      if (!visible) {
        const achievementId = consumeNotification();
        if (achievementId) {
          const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
          if (achievement) {
            setNotification({
              id: achievement.id,
              name: achievement.name,
              emoji: achievement.emoji,
            });
            setExiting(false);
            setVisible(true);
            playSound('wordValid');
            vibrate('wordValid');
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [visible, consumeNotification, playSound, vibrate]);

  useEffect(() => {
    if (visible && !exiting) {
      // Auto-hide after 3 seconds
      const hideTimer = setTimeout(() => {
        setExiting(true);
      }, 3000);

      return () => clearTimeout(hideTimer);
    }
  }, [visible, exiting]);

  useEffect(() => {
    if (exiting) {
      // Wait for fade animation to complete
      const removeTimer = setTimeout(() => {
        setVisible(false);
        setNotification(null);
        setExiting(false);
      }, 300);

      return () => clearTimeout(removeTimer);
    }
  }, [exiting]);

  if (!visible || !notification) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        exiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-bg-card border-2 border-accent shadow-xl rounded-xl px-6 py-4 flex items-center gap-4 animate-bounce-in">
        <span className="text-4xl">{notification.emoji}</span>
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wide">
            Achievement Unlocked!
          </p>
          <p className="text-lg font-bold text-text-primary">{notification.name}</p>
        </div>
      </div>
    </div>
  );
}
