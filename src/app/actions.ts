'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Init Firebase Admin (réutilise l'instance existante si déjà initialisée)
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

type CartItem = {
  id: string;
  name: any;
  price: number;
  currency: string;
  imageUrl: string;
  tokenProductId?: string;
  chapters?: any[];
  sessionTypeId?: string;
  timeSlotId?: string;
  type?: 'formation' | 'session' | 'soin';
};

export async function processCheckout(
  userId: string,
  items: CartItem[]
): Promise<{ success: boolean; error?: string }> {

  console.log(`---- CHECKOUT ----`);
  console.log(`User: ${userId}`);
  console.log(`Items:`, JSON.stringify(items, null, 2));

  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const batch = db.batch();
    const now = new Date();
    let totalPrana = 0;

    for (const item of items) {
      const isFormation = item.type === 'formation' || !!item.chapters;
      const isSession = item.type === 'session' || item.type === 'soin' || !!item.sessionTypeId;

      if (isFormation) {
        // ✅ Accès formation → débloque forum Runes et accès chapitres
        const userFormationRef = db
          .collection('users').doc(userId)
          .collection('formations').doc(item.id);

        batch.set(userFormationRef, {
          id: item.id,
          userId,
          formationId: item.id,
          tokenProductId: item.tokenProductId ?? item.id,
          enrollmentDate: now,
          completedChapters: [],
          certificationUrl: null,
          pricePaid: item.price,
          currency: item.currency,
        }, { merge: true });

        console.log(`✅ Formation enregistrée: ${item.id}`);
      }

      if (isSession) {
        // ✅ Achat séance → débloque forum Irisphère
        const userSessionRef = db
          .collection('users').doc(userId)
          .collection('userSessions').doc(item.id);

        batch.set(userSessionRef, {
          id: item.id,
          userId,
          sessionTypeId: item.sessionTypeId ?? item.id,
          timeSlotId: item.timeSlotId ?? null,
          purchaseDate: now,
          pricePaid: item.price,
          currency: item.currency,
          status: 'confirmed',
        }, { merge: true });

        console.log(`✅ Séance enregistrée: ${item.id}`);
      }

      // ✅ Prana — 1€ = 1.67 Prana
      totalPrana += Math.round((item.price / 100) * 1.67);
    }

    // Ajouter le Prana en une seule opération
    if (totalPrana > 0) {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        prana_wallet: FieldValue.increment(totalPrana),
      });
      console.log(`✅ Prana ajouté: ${totalPrana}`);
    }

    await batch.commit();
    console.log(`✅ Checkout complet pour ${userId}`);
    return { success: true };

  } catch (error: any) {
    console.error('Erreur checkout:', error);
    return { success: false, error: error.message };
  }
}