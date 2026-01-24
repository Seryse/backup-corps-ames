'use client';

import React, { useMemo, useState, useEffect, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookHeart, BookOpen, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { Booking, MergedBooking } from '@/lib/types';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { TimeSlot } from '@/lib/types';


export default function GrimoirePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  const grimoireDict = dict?.grimoire_page;
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'users', user.uid, 'bookings'), 
        where('reportStatus', '==', 'available'),
        orderBy('bookingTime', 'desc')
    ) as Query<Booking>;
  }, [firestore, user]);

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

  const grimoireEntries = useMemo(() => {
    if (!bookings || !sessionTypes || !timeSlots) return [];

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    return bookings
      .map(booking => {
        const sessionType = sessionTypeMap.get(booking.sessionTypeId);
        const timeSlot = timeSlotMap.get(booking.timeSlotId);
        if (!sessionType || !timeSlot) return null;
        return { ...booking, sessionType, timeSlot };
      })
      .filter((b): b is MergedBooking => b !== null);
  }, [bookings, sessionTypes, timeSlots]);


  const isLoading = isUserLoading || isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || !dict;

  if (isLoading || !grimoireDict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline flex items-center gap-4"><BookHeart className="h-10 w-10 text-accent" />{grimoireDict.title}</h1>
            <p className="text-lg text-muted-foreground mt-2">{grimoireDict.subtitle}</p>
        </div>

        {grimoireEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {grimoireEntries.map(entry => {
                    const sessionDate = entry.timeSlot.startTime.toDate();
                    return (
                        <Card key={entry.id} className="flex flex-col">
                            <CardHeader className="flex-row gap-4 items-start">
                                <div className="relative aspect-[3/4] w-28 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                    {entry.pdfThumbnail ? (
                                        <Image src={entry.pdfThumbnail} alt={grimoireDict.report_for.replace('{date}', format(sessionDate, 'PPP', { locale: dateFnsLocale }))} fill className="object-cover rounded-lg" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                                            <BookOpen className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <CardTitle>{grimoireDict.voyage_title}</CardTitle>
                                    <CardDescription className="text-base font-semibold pt-1">
                                        {format(sessionDate, 'dd MMMM yyyy', { locale: dateFnsLocale })}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardFooter>
                                <Button asChild className="w-full">
                                   <a href={entry.pdfUrl} target="_blank" rel="noopener noreferrer">
                                     <BookOpen className="mr-2 h-4 w-4" />
                                     {grimoireDict.open_button}
                                   </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <BookHeart className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-headline">{grimoireDict.no_reports_title}</h2>
                <p className="text-muted-foreground mt-2">{grimoireDict.no_reports_description}</p>
            </div>
        )}
    </div>
  );
}
