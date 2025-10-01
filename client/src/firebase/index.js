// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxCbtq3wSEDfvy-XSJPnEAyFPBfN0qfc4",
  authDomain: "mestermind.firebaseapp.com",
  projectId: "mestermind",
  storageBucket: "mestermind.firebasestorage.app",
  messagingSenderId: "5294589874",
  appId: "1:5294589874:web:6ffbeb97aaf944d2d846ab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { app };