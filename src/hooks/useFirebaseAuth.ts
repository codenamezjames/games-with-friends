import { useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';

export function useFirebaseAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { playerId, setPlayerId } = useRoomStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          setError(err as Error);
          setLoading(false);
        }
      } else {
        setPlayerId(user.uid);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setPlayerId]);

  return { playerId, loading, error };
}
