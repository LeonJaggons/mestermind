import { auth } from "@/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  User,
} from "firebase/auth";

export async function loginWithEmailAndPassword(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signupWithEmail(options: { email: string; password: string; displayName?: string }): Promise<User> {
  const { email, password, displayName } = options;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  try {
    await sendEmailVerification(result.user);
  } catch (_) {}
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}


