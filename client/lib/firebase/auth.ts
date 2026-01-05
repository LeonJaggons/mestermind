import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User,
  UserCredential,
} from "firebase/auth";
import { auth } from "./config";

// Email/Password Authentication
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

// Social Authentication
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const signInWithGithub = async (): Promise<UserCredential> => {
  const provider = new GithubAuthProvider();
  return await signInWithPopup(auth, provider);
};

// Sign Out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Password Reset
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

// Update User Profile
export const updateUserProfile = async (
  user: User,
  profile: { displayName?: string; photoURL?: string }
): Promise<void> => {
  await updateProfile(user, profile);
};

// Update User Email
export const updateUserEmail = async (
  user: User,
  newEmail: string
): Promise<void> => {
  await updateEmail(user, newEmail);
};

// Update User Password
export const updateUserPassword = async (
  user: User,
  newPassword: string
): Promise<void> => {
  await updatePassword(user, newPassword);
};

// Get Current User
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
