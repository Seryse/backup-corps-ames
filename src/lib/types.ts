import { Locale } from '@/i18n-config';
import type { SessionType } from '@/components/admin/session-type-manager';

export type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

// This type now represents the single source of truth for a booked session.
export interface LiveSession {
    id: string;
    
    // Booking Info
    userId: string;
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any; // Firestore Timestamp
    bookingStatus: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;
    
    // Grimoire / Report Info
    reportStatus: 'pending' | 'available';
    pdfUrl?: string | null;
    pdfThumbnail?: string | null;

    // Live Session State
    hostId: string;
    sessionStatus: 'WAITING' | 'INTRO' | 'HEALING' | 'OUTRO';
    startTime?: any; // Firestore Timestamp for session phase
    lang?: Locale;
    activePlaylistUrl?: string;
    subtitle?: any;
}


// This type merges the session with its related data for display purposes.
export type MergedSession = LiveSession & {
    sessionType: SessionType;
    timeSlot: TimeSlot;
};
