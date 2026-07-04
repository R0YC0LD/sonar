import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Yapilandirma yoksa Firebase'i hic baslatma (getAuth aksi halde hata firlatir).
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : (undefined as any);
export const auth = isFirebaseConfigured ? getAuth(app) : (undefined as any);
export const db = isFirebaseConfigured ? getFirestore(app) : (undefined as any);
export const storage = isFirebaseConfigured ? getStorage(app) : (undefined as any);

// Analytics opsiyonel; sadece destekleniyorsa ve measurementId varsa baslat.
if (isFirebaseConfigured && firebaseConfig.measurementId) {
  analyticsSupported()
    .then((ok) => ok && getAnalytics(app))
    .catch(() => {});
}

export function waitForAuthState(): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    }, reject);
  });
}

export function signInWithEmail(email: string, password: string): Promise<User> {
  return signInWithEmailAndPassword(auth, email, password).then((cred) => cred.user);
}

export function createAccountWithEmail(email: string, password: string): Promise<User> {
  return createUserWithEmailAndPassword(auth, email, password).then((cred) => cred.user);
}

export function signOutCurrentUser(): Promise<void> {
  return signOut(auth);
}

export function listenAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function requireCurrentUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("Oturum acilmadi."));
    });
  });
}
