'use server'

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// This is a simplified check. In a real app, you'd have more robust logic.
// This function checks a 'sessions' collection for a document matching today's date.
// The document should have a 'status' of 'paid' and the user's UID in an 'attendees' array.
export async function checkSessionAccess(userId: string): Promise<boolean> {
  if (!userId) return false;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // This is a placeholder for your actual session logic.
    // We assume there's a collection 'sessions' and each document is named by date 'YYYY-MM-DD'.
    const sessionRef = doc(db, 'sessions', today);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      const sessionData = sessionSnap.data();
      const userIsAttendee = sessionData.attendees?.includes(userId);
      const sessionIsPaid = sessionData.status === 'paid';

      // For the purpose of this demo, we'll return true if the document exists and status is paid.
      // In a real app, you would check if the user is in the attendees list.
      return sessionIsPaid;
    }
    
    // As a fallback for demonstration, we will check a user-specific document.
    // This is NOT secure for production but allows for easy testing.
    const userSessionRef = doc(db, 'user_sessions', userId);
    const userSessionSnap = await getDoc(userSessionRef);
    if(userSessionSnap.exists()){
      const data = userSessionSnap.data();
      const sessionDate = data.date; // expecting YYYY-MM-DD
      return data.status === 'paid' && sessionDate === today;
    }

    return false;

  } catch (error) {
    console.error("Error checking session access:", error);
    return false;
  }
}
