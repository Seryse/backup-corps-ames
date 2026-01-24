'use client';

import {
  doc,
  collection,
  runTransaction,
  increment,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';

export async function createBooking(
  firestore: Firestore,
  userId: string,
  timeSlotId: string,
  sessionTypeId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !timeSlotId || !sessionTypeId) {
    return { success: false, error: 'Missing required information.' };
  }

  try {
    const timeSlotRef = doc(firestore, 'timeSlots', timeSlotId);
    const sessionTypeRef = doc(firestore, 'sessionTypes', sessionTypeId);
    const userBookingRef = doc(collection(firestore, 'users', userId, 'bookings'));

    await runTransaction(firestore, async (transaction) => {
      const timeSlotDoc = await transaction.get(timeSlotRef);
      const sessionTypeDoc = await transaction.get(sessionTypeRef);

      if (!timeSlotDoc.exists()) {
        throw new Error('Time slot not found.');
      }
      if (!sessionTypeDoc.exists()) {
        throw new Error('Session type not found.');
      }

      const timeSlotData = timeSlotDoc.data();
      const sessionTypeData = sessionTypeDoc.data() as SessionType;

      if (timeSlotData.bookedParticipantsCount >= sessionTypeData.maxParticipants) {
        throw new Error('This time slot is now full.');
      }

      transaction.update(timeSlotRef, {
        bookedParticipantsCount: increment(1),
      });

      const visioToken = `VISIO-${userId.substring(0, 4)}-${timeSlotId.substring(
        0,
        4
      )}-${Date.now()}`;

      transaction.set(userBookingRef, {
        userId,
        timeSlotId,
        sessionTypeId,
        bookingTime: serverTimestamp(),
        status: 'confirmed',
        visioToken: visioToken,
        reportStatus: 'pending',
        pdfUrl: null,
        pdfThumbnail: null,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during booking.',
    };
  }
}
