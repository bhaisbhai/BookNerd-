import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgO7pcsL-zQjw2900IwVzhPeaQt2nQTn0",
  authDomain: "gen-lang-client-0463861832.firebaseapp.com",
  projectId: "gen-lang-client-0463861832",
  storageBucket: "gen-lang-client-0463861832.firebasestorage.app",
  messagingSenderId: "311803552957",
  appId: "1:311803552957:web:15563da63e2828b3e803d4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// For named Firestore database
export const db = getFirestore(app, "ai-studio-bookseriestracke-c1e1e52a-a2ec-4394-b2a8-6a168b411086");
