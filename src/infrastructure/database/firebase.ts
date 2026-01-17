import { FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
const shouldEnablePersistence = import.meta.env.VITE_FIREBASE_PERSISTENCE === 'true';
export const firebaseFirestore = shouldEnablePersistence
  ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true })
  : getFirestore(firebaseApp);

if (shouldEnablePersistence) {
  void enableIndexedDbPersistence(firebaseFirestore).catch((error) => {
    console.warn('Failed to enable Firestore persistence', error);
  });
}
export const firebaseStorage = getStorage(firebaseApp);
