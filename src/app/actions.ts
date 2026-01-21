'use server'

import { db } from '@/firebase/server';
import { doc, getDoc, writeBatch, collection, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import type { CartItem } from '@/components/providers/cart-provider';
import type { TranslateTextInput } from '@/ai/flows/translate-text';

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
