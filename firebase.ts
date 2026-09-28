
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// === FIREBASE SETUP ===
// WICHTIG: Ersetze diese Werte durch deine eigenen Firebase-Projektdaten!
const firebaseConfig = {
  apiKey: "AIzaSyAh6d3rsTvJiucmn2FKYwKzeS83Z2okJJU",
  authDomain: "bfc-stats-app.firebaseapp.com",
  projectId: "bfc-stats-app",
  storageBucket: "bfc-stats-app.firebasestorage.app",
  messagingSenderId: "848354620403",
  appId: "1:848354620403:web:340459bf691d98af005886",
};

// Firebase App initialisieren und Services exportieren
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west1');
