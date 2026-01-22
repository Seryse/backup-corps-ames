'use client';

import React, { useMemo, use } from 'react';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Calendar, Clock, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format, isPast } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { SessionType } from '@/components/admin/session-type-manager';

// Duplicated from other files, could be centralized
type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};
type Booking = {
    id: string;
    userId: string;
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any; // Firestore Timestamp
    status: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;
};
type MergedBooking = Booking & {
    sessionType: SessionType;
    timeSlot: TimeSlot;
};

export default function BookingsPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const dictPromise = getDictionary(lang);
  const dict = use(dictPromise);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const bookingsDict = dict.bookings_page;
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'bookings'), orderBy('bookingTime', 'desc')) as Query<Booking>;
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

  const { upcomingBookings, pastBookings } = useMemo(() => {
    if (!bookings || !sessionTypes || !timeSlots) return { upcomingBookings: [], pastBookings: [] };

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    const allMerged = bookings
      .map(booking => {
        const sessionType = sessionTypeMap.get(booking.sessionTypeId);
        const timeSlot = timeSlotMap.get(booking.timeSlotId);
        if (!sessionType || !timeSlot) return null;
        return { ...booking, sessionType, timeSlot };
      })
      .filter((b): b is MergedBooking => b !== null)
      .sort((a, b) => b.timeSlot.startTime.toMillis() - a.timeSlot.startTime.toMillis());
    
    const now = new Date();
    const upcoming = allMerged.filter(b => !isPast(b.timeSlot.endTime.toDate()));
    const past = allMerged.filter(b => isPast(b.timeSlot.endTime.toDate()));

    return { upcomingBookings: upcoming, pastBookings: past };

  }, [bookings, sessionTypes, timeSlots]);


  const isLoading = isUserLoading || isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || !dict;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  const BookingCard = ({ booking }: { booking: MergedBooking }) => {
      const { sessionType, timeSlot } = booking;
      const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
      const startTime = timeSlot.startTime.toDate();
      const isUpcoming = !isPast(startTime);

      return (
        <Card key={booking.id} className="flex flex-col">
            <CardHeader className="flex-row gap-4 items-start">
                <div className="relative aspect-square w-24 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {sessionType.imageUrl ? (
                        <Image src={sessionType.imageUrl} alt={localizedName} fill className="object-cover rounded-lg" />
                    ) : (
                        <ImageOff className="h-10 w-10 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-grow">
                    <CardTitle>{localizedName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> 
                        {format(startTime, 'PPP', { locale: dateFnsLocale })}
                    </CardDescription>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> 
                        {format(startTime, 'p', { locale: dateFnsLocale })}
                    </CardDescription>
                </div>
            </CardHeader>
            {isUpcoming && (
                 <CardFooter>
                    <Button asChild className="w-full">
                       <Link href={`/${lang}/session/${booking.id}`}>
                         <Video className="mr-2 h-4 w-4" />
                         {bookingsDict.join_button}
                       </Link>
                    </Button>
                  </CardFooter>
            )}
        </Card>
      )
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline">{bookingsDict.title}</h1>
            <p className="text-lg text-muted-foreground">{bookingsDict.subtitle}</p>
        </div>

        <div className="space-y-12">
            <section>
                <h2 className="text-2xl font-headline mb-4">{bookingsDict.upcoming_title}</h2>
                {upcomingBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">{bookingsDict.no_upcoming}</p>
                        <Button asChild className="mt-4">
                            <Link href={`/${lang}/agenda`}>{bookingsDict.book_now}</Link>
                        </Button>
                    </div>
                )}
            </section>
            <section>
                <h2 className="text-2xl font-headline mb-4">{bookingsDict.past_title}</h2>
                {pastBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pastBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                    </div>
                ) : (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">{bookingsDict.no_past}</p>
                    </div>
                )}
            </section>
        </div>
    </div>
  );
}
