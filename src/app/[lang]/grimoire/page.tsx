'use client';

import React, { useMemo, useState, useEffect, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookHeart, Download, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { Booking, TimeSlot, MergedBooking } from '@/lib/types';

// This will be a filtered list of bookings that have available reports
type GrimoireEntry = MergedBooking & {
    pdfUrl: string;
    pdfThumbnail?: string | null;
};

export default function GrimoirePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary['grimoire_page'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.grimoire_page));
  }, [lang]);

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  // 1. Get user's bookings where a report is available
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'bookings'), 
        where('userId', '==', user.uid),
        where('reportStatus', '==', 'available'),
        orderBy('bookingTime', 'desc')
    ) as Query<Booking>;
  }, [firestore, user]);

  // 2. Get all session types and time slots to merge data
  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const timeSlotsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'timeSlots') as Query<TimeSlot>;
  }, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);

  // 3. Merge and filter the data
  const grimoireEntries = useMemo((): GrimoireEntry[] => {
    if (!bookings || !sessionTypes || !timeSlots) return [];

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    return bookings
      .map(booking => {
        const sessionType = sessionTypeMap.get(booking.sessionTypeId);
        const timeSlot = timeSlotMap.get(booking.timeSlotId);
        // Ensure all parts exist and it's the correct category with a PDF URL
        if (!sessionType || !timeSlot || sessionType.category !== 'irisphere-harmonia' || !booking.pdfUrl) {
            return null;
        }
        return { ...booking, sessionType, timeSlot } as GrimoireEntry;
      })
      .filter((b): b is GrimoireEntry => b !== null);

  }, [bookings, sessionTypes, timeSlots]);


  const isLoading = isUserLoading || isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || !dict;

  if (isLoading || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline flex items-center gap-4"><BookHeart className="h-10 w-10 text-accent"/>{dict.title}</h1>
            <p className="text-lg text-muted-foreground mt-2">{dict.subtitle}</p>
        </div>

        {grimoireEntries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {grimoireEntries.map(entry => {
                    const sessionDate = entry.timeSlot.startTime.toDate();
                    return (
                        <Card key={entry.id} className="flex flex-col group overflow-hidden">
                            <CardHeader className="p-0">
                                <div className="relative aspect-[3/4] bg-muted flex items-center justify-center">
                                    {entry.pdfThumbnail ? (
                                        <Image src={entry.pdfThumbnail} alt={`${dict.voyage_title} ${format(sessionDate, 'PPP', { locale: dateFnsLocale })}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                         <BookHeart className="h-16 w-16 text-muted-foreground" />
                                    )}
                                </div>
                            </CardHeader>
                             <CardContent className="p-4 flex-grow">
                                <CardTitle className="text-lg">{dict.voyage_title}</CardTitle>
                                <CardDescription>{format(sessionDate, 'PPP', { locale: dateFnsLocale })}</CardDescription>
                            </CardContent>
                            <div className="p-4 pt-0">
                                <Button asChild className="w-full">
                                   <a href={entry.pdfUrl} download target="_blank" rel="noopener noreferrer">
                                     <Download className="mr-2 h-4 w-4" />
                                     {dict.open_button}
                                   </a>
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>
        ) : (
             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <BookHeart className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-headline">{dict.no_reports_title}</h2>
                <p className="text-muted-foreground mt-2">{dict.no_reports_description}</p>
            </div>
        )}
    </div>
  );
}
