import { initializeApp, getApps } from "firebase/app";
import { getAuth as getFirebaseAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : "",
  authDomain: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : "",
  projectId: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : "",
  storageBucket: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : "",
  messagingSenderId: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : "",
  appId: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : "",
};

const isBrowser = typeof window !== "undefined";

let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;

const initApp = () => {
  if (appInstance) return appInstance;
  if (!firebaseConfig.apiKey) return null;
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return appInstance;
  } catch {
    return null;
  }
};

export const getApp = () => {
  if (!isBrowser) return null;
  return initApp();
};

export const getAuth = () => {
  if (!isBrowser) return null;
  if (authInstance) return authInstance;
  const app = getApp();
  if (!app) return null;
  try {
    authInstance = getFirebaseAuth(app);
    return authInstance;
  } catch {
    return null;
  }
};

export const getDb = () => {
  if (!isBrowser) return null;
  if (dbInstance) return dbInstance;
  const app = getApp();
  if (!app) return null;
  try {
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch {
    return null;
  }
};
