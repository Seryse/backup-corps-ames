'use client';

import {
  doc,
  collection,
  runTransaction,
  increment,
  serverTimestamp,
  query,
  where,
  getDocs,
  Firestore,
  arrayUnion,
} from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';

const ADMIN_UID = 'HvsOFzrOwFTHWTBVBextpZtV5I53';

export async function createBooking(
  firestore: Firestore,
  userId: string,
  timeSlotId: string,
  sessionTypeId: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!userId || !timeSlotId || !sessionTypeId) {
    return { success: false, error: 'Missing required information.' };
  }

  try {
    const timeSlotRef = doc(firestore, 'timeSlots', timeSlotId);
    const sessionTypeRef = doc(firestore, 'sessionTypes', sessionTypeId);

    // ✅ Chercher si une session de groupe existe déjà pour ce timeSlotId
    const existingSessionsQuery = query(
      collection(firestore, 'sessions'),
      where('timeSlotId', '==', timeSlotId)
    );
    const existingSessionsSnap = await getDocs(existingSessionsQuery);
    const existingSession = existingSessionsSnap.docs[0];

    let resultSessionId = '';

    await runTransaction(firestore, async (transaction) => {
      const timeSlotDoc = await transaction.get(timeSlotRef);
      const sessionTypeDoc = await transaction.get(sessionTypeRef);

      if (!timeSlotDoc.exists()) throw new Error('Time slot not found.');
      if (!sessionTypeDoc.exists()) throw new Error('Session type not found.');

      const timeSlotData = timeSlotDoc.data();
      const sessionTypeData = sessionTypeDoc.data() as SessionType;

      if (timeSlotData.bookedParticipantsCount >= sessionTypeData.maxParticipants) {
        throw new Error('This time slot is now full.');
      }

      // 1. Incrémenter le compteur de participants
      transaction.update(timeSlotRef, {
        bookedParticipantsCount: increment(1),
      });

      const visioToken = `VISIO-${userId.substring(0, 4)}-${timeSlotId.substring(0, 4)}-${Date.now()}`;

      if (existingSession) {
        // ✅ SESSION GROUPE EXISTANTE — ajouter le client aux participants
        resultSessionId = existingSession.id;
        transaction.update(existingSession.ref, {
          // Ajouter l'userId dans le tableau des participants
          participants: arrayUnion(userId),
          // Garder userId pour compatibilité (premier client)
          // bookedParticipantsCount est sur le timeSlot
        });
        console.log(`✅ Client ${userId} ajouté à la session existante ${existingSession.id}`);
      } else {
        // ✅ PREMIÈRE RÉSERVATION — créer la session
        const sessionRef = doc(collection(firestore, 'sessions'));
        resultSessionId = sessionRef.id;
        transaction.set(sessionRef, {
          userId,                    // Premier client (pour compatibilité)
          participants: [userId],    // ✅ Tableau de tous les participants
          timeSlotId,
          sessionTypeId,
          bookingTime: serverTimestamp(),
          bookingStatus: 'confirmed',
          visioToken,
          reportStatus: 'pending',
          pdfUrl: null,
          pdfThumbnail: null,
          hostId: ADMIN_UID,
          sessionStatus: 'WAITING',
          startTime: null,
          lang: null,
          activePlaylistUrl: null,
          subtitle: null,
        });
        console.log(`✅ Nouvelle session créée: ${resultSessionId}`);
      }
    });

    return { success: true, sessionId: resultSessionId };

  } catch (error: any) {
    console.error('Error creating session:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}