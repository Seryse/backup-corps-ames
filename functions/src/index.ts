import * as admin from "firebase-admin";
// Importation explicite des types et fonctions nécessaires
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Initialise le SDK Admin pour pouvoir communiquer avec les services Firebase
admin.initializeApp();

const firestore = admin.firestore();
const SEED_COST_FOR_REWARD = 1000;
const WALLET_REWARD_AMOUNT = 40;

/**
 * Cloud Function appelable pour convertir 1000 graines en 40€ dans le portefeuille virtuel.
 * 
 * @throws - `unauthenticated` si l'utilisateur n'est pas connecté.
 * @throws - `not-found` si le document utilisateur n'existe pas.
 * @throws - `failed-precondition` si l'utilisateur n'a pas assez de graines.
 */
// Ajout du type explicite `CallableRequest` pour le paramètre `request`
export const redeemGratitude = onCall(async (request: CallableRequest) => {
  // 1. Vérifier que l'utilisateur est authentifié. Le type `CallableRequest` garantit que `request.auth` existe.
  if (!request.auth) {
    logger.warn("Tentative de rédemption non authentifiée.");
    throw new HttpsError("unauthenticated", "Vous devez être connecté pour effectuer cette action.");
  }

  const userId = request.auth.uid;
  const userRef = firestore.doc(`users/${userId}`);

  logger.info(`Début de la tentative de rédemption pour l'utilisateur: ${userId}`);

  try {
    const newWalletBalance = await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        logger.error(`Document utilisateur introuvable pour l'UID: ${userId}`);
        throw new HttpsError("not-found", "Document utilisateur introuvable.");
      }

      const gamification = userDoc.data()?.gamification;

      if (!gamification || gamification.seeds < SEED_COST_FOR_REWARD) {
        const currentSeeds = gamification ? gamification.seeds : 0;
        logger.warn(`L'utilisateur ${userId} n'a pas assez de graines. Actuel: ${currentSeeds}, Requis: ${SEED_COST_FOR_REWARD}`);
        throw new HttpsError("failed-precondition", `Pas assez de graines. ${SEED_COST_FOR_REWARD} sont nécessaires.`);
      }

      const newSeedCount = gamification.seeds - SEED_COST_FOR_REWARD;
      const newWalletValue = (gamification.walletBalance || 0) + WALLET_REWARD_AMOUNT;

      transaction.update(userRef, {
        "gamification.seeds": newSeedCount,
        "gamification.walletBalance": newWalletValue,
      });

      return newWalletValue;
    });

    logger.info(`Réussite de la rédemption pour ${userId}. Nouveau solde portefeuille: ${newWalletBalance}€`);
    return { success: true, newWalletBalance: newWalletBalance };

  } catch (error) {
    if (error instanceof HttpsError) {
        logger.error(`Erreur HttpsError lors de la rédemption pour ${userId}:`, error);
        throw error;
    }
    logger.error(`Erreur inattendue lors de la rédemption pour ${userId}:`, error);
    throw new HttpsError("internal", "Une erreur interne est survenue.");
  }
});
