import { Locale } from '@/i18n-config';
import type { SessionType } from '@/components/admin/session-type-manager';

export type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any;
    endTime: any;
    bookedParticipantsCount: number;
};

export interface LiveSession {
    id: string;

    // Booking Info
    userId: string;                    // Premier client (compat)
    participants?: string[];           // ✅ Tous les clients du groupe
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any;
    bookingStatus: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;

    // Grimoire / Report Info
    reportStatus: 'pending' | 'available';
    pdfUrl?: string | null;
    pdfThumbnail?: string | null;

    // Live Session State
    hostId: string;
    sessionStatus: 'WAITING' | 'INTRO' | 'HEALING' | 'OUTRO';
    startTime?: any;
    lang?: Locale;
    activePlaylistUrl?: string;
    subtitle?: any;

    // SFU Cloudflare
    cfPractitionerSessionId?: string | null;
}

export type MergedSession = LiveSession & {
    sessionType: SessionType;
    timeSlot: TimeSlot;
};