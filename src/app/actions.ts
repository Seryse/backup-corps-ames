'use server'

import { db } from '@/firebase/server';
import { doc, getDoc, writeBatch, collection, serverTimestamp, getDocs, query, limit, updateDoc, addDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { CartItem } from '@/components/providers/cart-provider';
import type { TranslateTextInput } from '@/ai/types';
import type { SessionType } from '@/components/admin/session-type-manager';
import { randomBytes } from 'crypto';

// This function now checks if the user has purchased at least one formation.
export async function checkSessionAccess(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const userFormationsRef = collection(db, 'users', userId, 'formations');
    // We only need to know if at least one exists, so we limit the query to 1.
    const q = query(userFormationsRef, limit(1));
    const querySnapshot = await getDocs(q);
    
    // If the snapshot is not empty, it means the user has at least one formation.
    return !querySnapshot.empty;

  } catch (error) {
    console.error("Error checking session access:", error);
    return false;
  }
}

export async function processCheckout(userId: string, items: CartItem[]): Promise<{success: boolean}> {
    if (!userId || !items || items.length === 0) {
        return { success: false };
    }

    try {
        const batch = writeBatch(db);

        items.forEach(item => {
            const userFormationRef = doc(collection(db, 'users', userId, 'formations'));
            
            // This is a placeholder token generation strategy.
            // In a real-world scenario, you would use a more secure and meaningful token generation method.
            const accessToken = `${item.tokenProductId}-${userId.substring(0, 5)}-${Date.now()}`;

            batch.set(userFormationRef, {
                userId: userId,
                formationId: item.id,
                accessToken: accessToken,
                enrollmentDate: serverTimestamp(),
            });
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Error processing checkout:", error);
        return { success: false };
    }
}

export async function translateTextAction(input: TranslateTextInput) {
  // Dynamically import the flow to ensure it's not bundled on the client
  // and only loaded when the action is executed.
  const { translateText } = await import('@/ai/flows/translate-text');
  return await translateText(input);
}

export async function updateSessionState(sessionId: string, data: { triggerIntro?: boolean, activePlaylistUrl?: string }) {
    if (!sessionId) return { success: false, error: 'Session ID is required.' };
    
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, data);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating session state:", error);
        return { success: false, error: error.message };
    }
}

export async function submitTestimonial(
    { bookingId, userId, feedbackText, mediaUrl }: { bookingId: string, userId: string, feedbackText?: string, mediaUrl?: string }
): Promise<{ success: boolean, couponCode?: string, error?: string }> {
    if (!userId || !bookingId) return { success: false, error: 'User and Booking ID are required.' };

    try {
        const batch = writeBatch(db);

        // 1. Save the testimonial
        const testimonialRef = doc(collection(db, 'testimonials'));
        batch.set(testimonialRef, {
            userId,
            bookingId,
            feedbackText: feedbackText || '',
            mediaUrl: mediaUrl || '',
            submittedAt: serverTimestamp(),
        });
        
        // 2. Generate and save the coupon
        const couponCode = `MERCI-${randomBytes(3).toString('hex').toUpperCase()}`;
        const couponRef = doc(collection(db, 'coupons'));
        batch.set(couponRef, {
            code: couponCode,
            userId,
            discountPercentage: 10,
            createdAt: serverTimestamp(),
            isUsed: false
        });

        await batch.commit();

        return { success: true, couponCode };

    } catch (error: any) {
        console.error("Error submitting testimonial:", error);
        return { success: false, error: error.message };
    }
}

export async function updateFormationProgress(
  userId: string,
  userFormationId: string,
  chapterId: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !userFormationId || !chapterId) {
    return { success: false, error: 'User, formation, and chapter IDs are required.' };
  }

  try {
    const userFormationRef = doc(db, 'users', userId, 'formations', userFormationId);

    const docSnap = await getDoc(userFormationRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      return { success: false, error: 'Formation enrollment not found or access denied.' };
    }

    await updateDoc(userFormationRef, {
      completedChapters: isCompleted ? arrayUnion(chapterId) : arrayRemove(chapterId),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating formation progress:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
    
