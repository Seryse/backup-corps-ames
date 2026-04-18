"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemGratitude = void 0;
const admin = require("firebase-admin");
// Importation explicite des types et fonctions nécessaires
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
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
exports.redeemGratitude = (0, https_1.onCall)(async (request) => {
    // 1. Vérifier que l'utilisateur est authentifié. Le type `CallableRequest` garantit que `request.auth` existe.
    if (!request.auth) {
        logger.warn("Tentative de rédemption non authentifiée.");
        throw new https_1.HttpsError("unauthenticated", "Vous devez être connecté pour effectuer cette action.");
    }
    const userId = request.auth.uid;
    const userRef = firestore.doc(`users/${userId}`);
    logger.info(`Début de la tentative de rédemption pour l'utilisateur: ${userId}`);
    try {
        const newWalletBalance = await firestore.runTransaction(async (transaction) => {
            var _a;
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                logger.error(`Document utilisateur introuvable pour l'UID: ${userId}`);
                throw new https_1.HttpsError("not-found", "Document utilisateur introuvable.");
            }
            const gamification = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.gamification;
            if (!gamification || gamification.seeds < SEED_COST_FOR_REWARD) {
                const currentSeeds = gamification ? gamification.seeds : 0;
                logger.warn(`L'utilisateur ${userId} n'a pas assez de graines. Actuel: ${currentSeeds}, Requis: ${SEED_COST_FOR_REWARD}`);
                throw new https_1.HttpsError("failed-precondition", `Pas assez de graines. ${SEED_COST_FOR_REWARD} sont nécessaires.`);
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            logger.error(`Erreur HttpsError lors de la rédemption pour ${userId}:`, error);
            throw error;
        }
        logger.error(`Erreur inattendue lors de la rédemption pour ${userId}:`, error);
        throw new https_1.HttpsError("internal", "Une erreur interne est survenue.");
    }
});
//# sourceMappingURL=index.js.map