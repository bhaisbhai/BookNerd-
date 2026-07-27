import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0463861832";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBgO7pcsL-zQjw2900IwVzhPeaQt2nQTn0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${firebaseProjectId}.firebaseapp.com`,
  projectId: firebaseProjectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${firebaseProjectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "311803552957",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:311803552957:web:15563da63e2828b3e803d4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const firestoreDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID;
// Firestore's default transport streams over HTTP/2, which some corporate/school networks, VPNs,
// and carriers silently mangle - the connection just never completes, with no error thrown and no
// way to tell apart from an offline device (this was reported as writes reliably timing out with
// no response at all, while everything else - including Firebase Auth, which doesn't use this
// channel - worked fine). experimentalAutoDetectLongPolling falls back to long-polling in exactly
// that situation, and is a no-op for networks where streaming already works fine.
const firestoreSettings = { experimentalAutoDetectLongPolling: true };
export const db = firestoreDatabaseId
  ? initializeFirestore(app, firestoreSettings, firestoreDatabaseId)
  : initializeFirestore(app, firestoreSettings);
