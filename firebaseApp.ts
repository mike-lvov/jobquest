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

console.log(
  process.env.NEXT_PUBLIC_EMULATOR,
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST,
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT
)

if (process.env.NEXT_PUBLIC_EMULATOR ==='true') {
  const functions = getFunctions(getApp());
  if (
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST && 
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT) {
      console.log("Launcehd functions simulator");
      connectFunctionsEmulator(
        functions, 
        process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST,
        Number(process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT)
      );
  }
  
}