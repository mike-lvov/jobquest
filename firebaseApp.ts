import { initializeApp, getApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const clientCredentials = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


export const firebaseApp = initializeApp(clientCredentials);

// const functions = getFunctions(getApp());
// connectFunctionsEmulator(functions, "localhost", 5001);