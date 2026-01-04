import { useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';

export function useFirebaseAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { playerId, setPlayerId } = useRoomStore();

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const attemptSignIn = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          retryCount++;
          retryTimeout = setTimeout(attemptSignIn, delay);
        } else {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        attemptSignIn();
      } else {
        retryCount = 0;
        setPlayerId(user.uid);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(retryTimeout);
    };
  }, [setPlayerId]);

  return { playerId, loading, error };
}
