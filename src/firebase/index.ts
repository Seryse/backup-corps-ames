'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }
  
  let app: FirebaseApp;
  // This logic is crucial. In a deployed App Hosting environment,
  // this environment variable will be set automatically.
  // In local development, it will be undefined, and we'll use our local config.
  if (process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
      try {
        const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
        app = initializeApp(config);
      } catch (e) {
          console.error("Invalid NEXT_PUBLIC_FIREBASE_CONFIG:", e);
          // Fallback to hardcoded config on parse error
          app = initializeApp(firebaseConfig);
      }
  } else {
      // Fallback for local development
      app = initializeApp(firebaseConfig);
  }

  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
