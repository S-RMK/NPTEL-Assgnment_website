/**
 * Firebase Client Configuration
 * Initializes Firebase App and Firestore instance.
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeJnRvUbN1n8sjr7uICjmOpCs1zLqIEg4",
  authDomain: "nptel-nightowls.firebaseapp.com",
  databaseURL: "https://nptel-nightowls-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nptel-nightowls",
  storageBucket: "nptel-nightowls.firebasestorage.app",
  messagingSenderId: "473751337343",
  appId: "1:473751337343:web:a6d80e2d2bfc2f93d9c24a",
  measurementId: "G-XW94STN33P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
