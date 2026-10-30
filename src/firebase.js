// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc_RMef2ybSnCX1QIUM-ClWkamZPfNAlU",
  authDomain: "ttc-membership-manager.firebaseapp.com",
  databaseURL: "https://ttc-membership-manager-default-rtdb.firebaseio.com",
  projectId: "ttc-membership-manager",
  storageBucket: "ttc-membership-manager.firebasestorage.app",
  messagingSenderId: "143184445058",
  appId: "1:143184445058:web:00bb1cd5feb356117fbe9b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export Auth & Database instances
export const auth = getAuth(app);
export const db = getDatabase(app);