'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Locale } from '@/i18n-config';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Query, collectionGroup, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Calendar, Clock, Users, Link as LinkIcon, BookHeart } from 'lucide-react';
import Link from 'next/link';
import { format, isPast, isToday, startOfDay, endOfDay } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { Booking, MergedBooking, TimeSlot } from '@/lib/types';
import { GrimoireUploadDialog } from './GrimoireUploadDialog';
import { Badge } from '../ui/badge';


export default function AdminSessionManager({ lang, dictionary }: { lang: Locale, dictionary: any }) {
  const firestore = useFirestore();

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
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

  const { todaysBookings, pastBookings } = useMemo(() => {
    if (!bookings || !sessionTypes || !timeSlots) return { todaysBookings: [], pastBookings: [] };

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
      .sort((a, b) => a.timeSlot.startTime.toMillis() - b.timeSlot.startTime.toMillis());

    const today = new Date();
    const todayStart = startOfDay(today);
    
    const todays = allMerged.filter(b => {
        const startTime = b.timeSlot.startTime.toDate();
        return isToday(startTime);
    });

    const past = allMerged.filter(b => {
        const startTime = b.timeSlot.startTime.toDate();
        return isPast(startTime) && !isToday(startTime);
    });

    return { todaysBookings: todays, pastBookings: past.reverse() };
  }, [bookings, sessionTypes, timeSlots]);

  const isLoading = isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  const SessionCard = ({ booking }: { booking: MergedBooking }) => {
    const { sessionType, timeSlot } = booking;
    const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
    const startTime = timeSlot.startTime.toDate();
    const sessionHasEnded = isPast(timeSlot.endTime.toDate());

    const isGrimoireEligible = sessionType.name?.fr === 'Irisphère Harmonia - Séance Privée' && sessionHasEnded;

    return (
        <Card key={booking.id} className="flex flex-col">
            <CardHeader>
            <CardTitle>{localizedName}</CardTitle>
                <CardDescription className="flex items-center gap-2 pt-1 text-muted-foreground">
                    <Users className="h-4 w-4" /> 
                    {dictionary.admin.bookedBy}: {booking.userId.substring(0, 8)}...
                </CardDescription>
                <CardDescription className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> 
                    {format(startTime, 'Pp', { locale: dateFnsLocale })}
                </CardDescription>
                {booking.reportStatus === 'available' && <Badge variant="secondary">{dictionary.admin.grimoire.report_sent}</Badge>}
            </CardHeader>
            <CardContent className="flex-grow">
              
            </CardContent>
            <CardContent className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full" variant="outline">
                    <Link href={`/${lang}/session/${booking.id}?token=${booking.visioToken}&uid=${booking.userId}`}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {dictionary.admin.joinCall}
                    </Link>
                </Button>
                {isGrimoireEligible && (
                    <GrimoireUploadDialog booking={booking} dictionary={dictionary} />
                )}
            </CardContent>
        </Card>
    )
  }

  return (
    <section className="space-y-8">
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Video className="h-8 w-8 text-accent" />
                <h2 className="text-3xl font-headline">{dictionary.admin.todaysSessions}</h2>
            </div>
            {todaysBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {todaysBookings.map(booking => <SessionCard key={booking.id} booking={booking} />)}
            </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Calendar className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-6 text-2xl font-headline">{dictionary.admin.noSessionsToday}</h2>
                    <p className="text-muted-foreground mt-2">{dictionary.admin.noSessionsTodayDescription}</p>
                </div>
            )}
        </div>
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Calendar className="h-8 w-8 text-accent" />
                <h2 className="text-3xl font-headline">{dictionary.admin.pastSessions}</h2>
            </div>
            {pastBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pastBookings.map(booking => <SessionCard key={booking.id} booking={booking} />)}
            </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">{dictionary.admin.noPastSessions}</p>
                </div>
            )}
        </div>
    </section>
  );
}
