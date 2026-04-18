import 'server-only';
import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Auth } from 'firebase-admin/auth';

// --- Environment Variables ---
// On récupère les variables SANS le "!" (on accepte qu'elles puissent être undefined)
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Variables pour stocker nos instances (peuvent être null si pas de clé)
let app: admin.app.App | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// --- Firebase Admin Initialization ---
// On vérifie si une app existe déjà pour éviter le hot-reload crash
if (!admin.apps.length) {
  // SÉCURITÉ BUILD : On ne tente l'init QUE si toutes les clés sont là
  if (projectId && clientEmail && privateKey) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.warn("⚠️ Firebase Admin: Erreur lors de l'initialisation (Ignoré pour le build)", error);
    }
  } else {
    // Si on n'a pas les clés (cas actuel), on ne fait RIEN (pas de crash)
    console.warn("⚠️ Firebase Admin: Clés manquantes. Le serveur Admin est désactivé pour le build.");
  }
} else {
  // Si l'app existe déjà, on la récupère
  app = admin.app();
}

// On n'assigne db et auth que si l'app a bien été créée
if (app) {
  db = getFirestore(app);
  auth = admin.auth(app);
}

// Export des services (ils seront 'null' pendant ce build, ce qui évite l'erreur fatale)
// Note: Les pages qui utilisent 'db' côté serveur devront vérifier s'il existe avant de l'appeler,
// mais comme on a désactivé les Actions, ça devrait passer !
export { app, db, auth };