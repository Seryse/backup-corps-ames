'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Calendar, Clock, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format, isBefore, addMinutes, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { SessionType } from '@/components/admin/session-type-manager';

// From agenda/page.tsx
type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

// From backend.json
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

export default function SessionPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [now, setNow] = useState(new Date());

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // Force re-render every minute to update countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // every 60 seconds
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.session));
  }, [lang]);

  const upcomingBookings: MergedBooking[] = useMemo(() => {
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
      .filter((b): b is MergedBooking => b !== null && isBefore(now, b.timeSlot.endTime.toDate()))
      .sort((a, b) => a.timeSlot.startTime.toMillis() - b.timeSlot.startTime.toMillis());
  }, [bookings, sessionTypes, timeSlots, now]);

  const isLoading = isUserLoading || isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || !dict;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const renderCountdown = (startTime: Date) => {
    if (!dict) return '';
    const tenMinutesBefore = addMinutes(startTime, -10);
    if (isBefore(now, tenMinutesBefore)) {
      const distance = formatDistanceToNow(startTime, { locale: dateFnsLocale, addSuffix: true });
      return dict.starts_in_distance.replace('{distance}', distance);
    }
    if (isBefore(now, startTime)) {
      const minutes = differenceInMinutes(startTime, now);
      return dict.starts_in_minutes.replace('{minutes}', minutes.toString());
    }
    return dict.in_progress;
  };


  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <Video className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict?.title}</h1>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingBookings.map(booking => {
              const { sessionType, timeSlot } = booking;
              const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
              const startTime = timeSlot.startTime.toDate();
              const isConnectable = isBefore(addMinutes(startTime, -10), now);

              return (
                <Card key={booking.id} className="flex flex-col">
                  <CardHeader>
                      <div className="relative aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                          {sessionType.imageUrl ? (
                              <Image
                                  src={sessionType.imageUrl}
                                  alt={localizedName}
                                  fill
                                  className="object-cover rounded-t-lg"
                              />
                          ) : (
                              <ImageOff className="h-12 w-12 text-muted-foreground" />
                          )}
                      </div>
                    <CardTitle className="pt-4">{localizedName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> 
                        {format(startTime, 'PPP', { locale: dateFnsLocale })}
                    </CardDescription>
                     <CardDescription className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> 
                        {format(startTime, 'p', { locale: dateFnsLocale })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                      <p className="text-sm font-medium text-accent">
                          {renderCountdown(startTime)}
                      </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" disabled={!isConnectable}>
                       <Link href={`/${lang}/session/${booking.id}?token=${booking.visioToken}`}>
                         <Video className="mr-2 h-4 w-4" />
                         {dict?.connect}
                       </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
            <Card>
                <CardHeader>
                    <CardTitle>{dict?.no_upcoming_title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                       {dict?.no_upcoming_description}
                    </p>
                    <Button asChild className="mt-4">
                        <Link href={`/${lang}/agenda`}>{dict?.book_a_session}</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
