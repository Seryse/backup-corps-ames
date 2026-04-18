'use client';

// J'ai mis un chemin simple './config' pour être sûr qu'il trouve le fichier
import { firebaseConfig } from './config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }
  
  // VERSION BAZOOKA : ON FORCE LA CONFIG
  console.log("💣 BAZOOKA ACTIVÉ : Connexion forcée à corps-et-ames-adc60");
  const app = initializeApp(firebaseConfig);
  return getSdks(app);
}

// J'ai ajouté ": FirebaseApp" ici pour calmer les lignes rouges
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