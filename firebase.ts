
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence 
} from 'firebase/firestore';

// Note: In a production environment, these should be populated via environment variables.
// For this implementation, we assume the environment is pre-configured or these placeholders
// represent the target project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyA_5d1jee7AivZA2u0x6J9n4zd73iy7Er8",
  authDomain: "streakflow-8aa6a.firebaseapp.com",
  projectId: "streakflow-8aa6a",
  storageBucket: "streakflow-8aa6a.firebasestorage.app",
  messagingSenderId: "568602060303",
  appId: "1:568602060303:web:4d5b02b9f10c9cb2d9657a",
  measurementId: "G-8F89XP86W5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence is not available in this browser');
  }
});
