// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxCbtq3wSEDfvy-XSJPnEAyFPBfN0qfc4",
  authDomain: "mestermind.firebaseapp.com",
  projectId: "mestermind",
  storageBucket: "mestermind.firebasestorage.app",
  messagingSenderId: "5294589874",
  appId: "1:5294589874:web:6ffbeb97aaf944d2d846ab"
};

// Initialize Firebase (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
