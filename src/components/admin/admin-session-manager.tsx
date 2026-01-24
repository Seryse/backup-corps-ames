'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, isPast, isToday } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Query, collectionGroup } from 'firebase/firestore';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Video, Calendar, Clock, Users, Link as LinkIcon, BookHeart, Download } from 'lucide-react';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { Booking, MergedBooking, TimeSlot } from '@/lib/types';
import { GrimoireUploadDialog } from './GrimoireUploadDialog';

type UserProfile = {
    id: string;
    displayName?: string;
    email?: string;
};

type AdminMergedBooking = MergedBooking & {
    user: UserProfile;
}

export default function AdminSessionManager({ lang, dictionary }: { lang: Locale, dictionary: any }) {
  const firestore = useFirestore();

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'bookings')) as Query<Booking>;
  }, [firestore]);

  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const timeSlotsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'timeSlots') as Query<TimeSlot>;
  }, [firestore]);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users') as Query<UserProfile>;
  }, [firestore]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const { todaysBookings, pastBookings } = useMemo(() => {
    if (!bookings || !sessionTypes || !timeSlots || !users) return { todaysBookings: [], pastBookings: [] };

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const allMerged = bookings
      .map(booking => {
        const sessionType = sessionTypeMap.get(booking.sessionTypeId);
        const timeSlot = timeSlotMap.get(booking.timeSlotId);
        const user = userMap.get(booking.userId);
        if (!sessionType || !timeSlot || !user) return null;
        return { ...booking, sessionType, timeSlot, user };
      })
      .filter((b): b is AdminMergedBooking => b !== null);
    
    const todays = allMerged.filter(b => {
        const startTime = b.timeSlot.startTime.toDate();
        return isToday(startTime);
    }).sort((a,b) => a.timeSlot.startTime.toMillis() - b.timeSlot.startTime.toMillis());

    const past = allMerged.filter(b => {
        const endTime = b.timeSlot.endTime.toDate();
        return isPast(endTime) && !isToday(b.timeSlot.startTime.toDate());
    }).sort((a,b) => b.timeSlot.startTime.toMillis() - a.timeSlot.startTime.toMillis());

    return { todaysBookings: todays, pastBookings: past };
  }, [bookings, sessionTypes, timeSlots, users]);

  const isLoading = isLoadingBookings || isLoadingSessionTypes || isLoadingTimeSlots || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  const SessionCard = ({ booking }: { booking: AdminMergedBooking }) => {
    const { sessionType, timeSlot, user } = booking;
    const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
    const startTime = timeSlot.startTime.toDate();
    const sessionHasEnded = isPast(timeSlot.endTime.toDate());

    const isGrimoireEligible = sessionType.category === 'irisphere-harmonia' && sessionType.sessionModel === 'private';
    const userIdentifier = user.displayName || user.email || booking.userId;

    return (
        <Card key={booking.id} className="flex flex-col">
            <CardHeader>
                <CardTitle>{localizedName}</CardTitle>
                <CardDescription className="flex items-center gap-2 pt-1 text-muted-foreground">
                    <Clock className="h-4 w-4" /> 
                    {format(startTime, 'Pp', { locale: dateFnsLocale })}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> 
                    <span>{dictionary.admin.bookedBy}: {userIdentifier}</span>
                </div>
                {isGrimoireEligible && (
                    <div>
                        {booking.reportStatus === 'available' && <Badge variant="secondary">{dictionary.admin.grimoire.report_sent}</Badge>}
                        <div className="relative aspect-[3/4] w-28 mt-2 bg-muted rounded-md flex items-center justify-center">
                            {booking.pdfThumbnail ? (
                                <Image src={booking.pdfThumbnail} alt="Grimoire thumbnail" fill className="object-cover rounded-md" />
                            ) : (
                                <BookHeart className="h-10 w-10 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-stretch sm:flex-row gap-2">
                {!sessionHasEnded && (
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/${lang}/session/${booking.id}?token=${booking.visioToken}&uid=${booking.userId}`}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {dictionary.admin.joinCall}
                        </Link>
                    </Button>
                )}

                {sessionHasEnded && isGrimoireEligible && (
                    <>
                        {booking.reportStatus === 'available' && booking.pdfUrl && (
                             <Button asChild className="flex-1" variant="secondary">
                               <a href={booking.pdfUrl} download target="_blank" rel="noopener noreferrer">
                                 <Download className="mr-2 h-4 w-4" />
                                 {dictionary.admin.grimoire.download_button || 'Download'}
                               </a>
                            </Button>
                        )}
                        <GrimoireUploadDialog booking={booking} dictionary={dictionary} className="flex-1" />
                    </>
                )}
            </CardFooter>
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
