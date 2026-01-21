'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Locale } from '@/i18n-config';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Calendar, Clock, Users, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { format, isBefore, addMinutes, differenceInMinutes, formatDistanceToNow, isToday } from 'date-fns';
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
    id:string;
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

export default function UpcomingSessions({ lang, dictionary }: { lang: Locale, dictionary: any }) {
  const firestore = useFirestore();
  const [now, setNow] = useState<Date | null>(null);

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // every 60 seconds
    return () => clearInterval(timer);
  }, []);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'bookings'), orderBy('bookingTime', 'desc')) as Query<Booking>;
  }, [firestore]);

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

  const todaysBookings: MergedBooking[] = useMemo(() => {
    if (!bookings || !sessionTypes || !timeSlots || !now) return [];

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    return bookings
      .map(booking => {
        const sessionType = sessionTypeMap.get(booking.sessionTypeId);
        const timeSlot = timeSlotMap.get(booking.timeSlotId);
        if (!sessionType || !timeSlot) return null;
        return { ...booking, sessionType, timeSlot };
      })
      .filter((b): b is MergedBooking => {
          if (b === null) return false;
          const startTime = b.timeSlot.startTime.toDate();
          // Filter for sessions that are today and haven't ended yet
          return isToday(startTime) && isBefore(now, b.timeSlot.endTime.toDate());
      })
      .sort((a, b) => a.timeSlot.startTime.toMillis() - b.timeSlot.startTime.toMillis());
  }, [bookings, sessionTypes, timeSlots, now]);

  const isLoading = isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || !now;

  const renderCountdown = (startTime: Date) => {
    if (!dictionary || !now) return '';
    const tenMinutesBefore = addMinutes(startTime, -10);
    if (isBefore(now, tenMinutesBefore)) {
      const distance = formatDistanceToNow(startTime, { locale: dateFnsLocale, addSuffix: true });
      return dictionary.session.starts_in_distance.replace('{distance}', distance);
    }
    if (isBefore(now, startTime)) {
      const minutes = differenceInMinutes(startTime, now);
      return dictionary.session.starts_in_minutes.replace('{minutes}', minutes.toString());
    }
    return dictionary.session.in_progress;
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  return (
    <section>
        <div className="flex items-center gap-4 mb-8">
            <Video className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-headline">{dictionary.admin.todaysSessions}</h2>
        </div>
        
        {todaysBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {todaysBookings.map(booking => {
              const { sessionType, timeSlot } = booking;
              const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
              const startTime = timeSlot.startTime.toDate();
              const isConnectable = now ? isBefore(addMinutes(startTime, -10), now) : false;

              return (
                <Card key={booking.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{localizedName}</CardTitle>
                     <CardDescription className="flex items-center gap-2 pt-1 text-muted-foreground">
                        <Users className="h-4 w-4" /> 
                        Booked by: {booking.userId.substring(0, 8)}...
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
                  <CardContent>
                    <Button asChild className="w-full" disabled={!isConnectable}>
                       <Link href={`/${lang}/session/${booking.id}?token=${booking.visioToken}`}>
                         <LinkIcon className="mr-2 h-4 w-4" />
                         {dictionary.admin.joinCall}
                       </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Calendar className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-headline">{dictionary.admin.noSessionsToday}</h2>
                <p className="text-muted-foreground mt-2">{dictionary.admin.noSessionsTodayDescription}</p>
            </div>
        )}
    </section>
  );
}
