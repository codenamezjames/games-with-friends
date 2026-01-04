import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export database and auth instances
export const db = getDatabase(app);
export const auth = getAuth(app);
