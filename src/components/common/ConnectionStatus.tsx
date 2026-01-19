import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });
    return unsubscribe;
  }, []);

  if (isConnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-warning text-bg-main py-1 px-4 text-center text-sm font-medium z-50 animate-pulse">
      Connection lost. Reconnecting...
    </div>
  );
}
