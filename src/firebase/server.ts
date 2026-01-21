import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
// This guard is needed to prevent re-initializing the app on hot reloads.
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db: Firestore = getFirestore(app);

export { app, db };
