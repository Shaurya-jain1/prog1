"use client";

import { getAuth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const EMAIL_DOMAIN = "@linehai.app";

export const phoneToEmail = (phone: string) =>
  `+91${phone}${EMAIL_DOMAIN}`;

export const registerWithPassword = async (phone: string, password: string) => {
  const auth = getAuth();
  if (!auth) throw new Error("Auth not initialized");
  const email = phoneToEmail(phone);
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithPassword = async (phone: string, password: string) => {
  const auth = getAuth();
  if (!auth) throw new Error("Auth not initialized");
  const email = phoneToEmail(phone);
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOut = () => {
  const auth = getAuth();
  if (auth) firebaseSignOut(auth);
};

export const onAuthChange = (
  callback: (user: User | null) => void
): (() => void) => {
  const auth = getAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};
