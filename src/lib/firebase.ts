import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export database and auth instances
export const db = getDatabase(app);
export const auth = getAuth(app);

// Connect to emulators in development/test mode
// Set VITE_USE_FIREBASE_EMULATORS=true to use emulators
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  console.log('[Firebase] Connecting to emulators...');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  console.log('[Firebase] Connected to emulators');
}
