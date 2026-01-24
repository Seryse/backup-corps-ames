import type { SessionType } from '@/components/admin/session-type-manager';

export type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

export type Booking = {
    id: string;
    userId: string;
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any; // Firestore Timestamp
    status: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;
    reportStatus: 'pending' | 'available';
    pdfUrl?: string | null;
    pdfThumbnail?: string | null;
};

export type MergedBooking = Booking & {
    sessionType: SessionType;
    timeSlot: TimeSlot;
};
