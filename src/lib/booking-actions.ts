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

// This is the admin's UID from the security rules.
const ADMIN_UID = 'HvsOFzrOwFTHWTBVBextpZtV5I53';

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
    // References to the documents we'll be working with.
    const timeSlotRef = doc(firestore, 'timeSlots', timeSlotId);
    const sessionTypeRef = doc(firestore, 'sessionTypes', sessionTypeId);
    // Create a reference for a new booking document with a unique ID.
    const bookingRef = doc(collection(firestore, 'bookings'));
    // The session document will have the same ID as the booking for easy correlation.
    const sessionRef = doc(firestore, 'sessions', bookingRef.id);

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

      // Check if the slot is full.
      if (timeSlotData.bookedParticipantsCount >= sessionTypeData.maxParticipants) {
        throw new Error('This time slot is now full.');
      }

      // 1. Update the participant count on the time slot.
      transaction.update(timeSlotRef, {
        bookedParticipantsCount: increment(1),
      });

      // 2. Create the booking document.
      const visioToken = `VISIO-${userId.substring(0, 4)}-${timeSlotId.substring(
        0,
        4
      )}-${Date.now()}`;
      transaction.set(bookingRef, {
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

       // 3. Create the corresponding session document proactively.
      transaction.set(sessionRef, {
          hostId: ADMIN_UID,
          userId: userId,
          bookingId: bookingRef.id,
          status: 'WAITING',
          // Initialize other fields to null or default values
          startTime: null,
          lang: null,
          activePlaylistUrl: null,
          subtitle: null,
      });

    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating booking and session:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during booking.',
    };
  }
}
