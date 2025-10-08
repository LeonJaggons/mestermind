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
import { cleanupOnboardingData } from "./onboardingCleanup";

export async function loginWithEmailAndPassword(
  email: string,
  password: string,
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signupWithEmail(options: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<User> {
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
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email;
  
  // Clean up onboarding data before signing out
  if (userEmail) {
    try {
      await cleanupOnboardingData({ 
        email: userEmail,
        cleanupStorage: true 
      });
    } catch (error) {
      console.error('Error cleaning up onboarding data during logout:', error);
      // Don't block logout if cleanup fails
    }
  }
  
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}
