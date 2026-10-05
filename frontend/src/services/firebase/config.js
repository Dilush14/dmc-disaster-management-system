import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const isFirebaseConfigured = Object.values(config).every(value => typeof value === 'string' && value.trim());
// Lazy initialization keeps design previews independent of credentials or network.
let services;
export function getFirebaseServices() {
  if (!isFirebaseConfigured) return null;
  if (!services) {
    const app = getApps().length ? getApp() : initializeApp(config);
    services = { app, auth: getAuth(app), firestore: getFirestore(app), storage: getStorage(app) };
  }
  return services;
}
