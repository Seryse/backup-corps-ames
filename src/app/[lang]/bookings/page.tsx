'use client';

import React, { useMemo, useState, useEffect, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Calendar, Clock, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format, isPast } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { LiveSession, TimeSlot, MergedSession } from '@/lib/types';

export default function BookingsPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  const bookingsDict = dict?.bookings_page;
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  const sessionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // CORRECTION : Filtre strict par userId pour passer la sécurité
    return query(collection(firestore, 'sessions'), where('userId', '==', user.uid), orderBy('bookingTime', 'desc')) as Query<LiveSession>;
  }, [firestore, user]);

  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const timeSlotsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'timeSlots') as Query<TimeSlot>;
  }, [firestore]);

  const { data: sessions, isLoading: isLoadingSessions } = useCollection<LiveSession>(sessionsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);

  const { upcomingSessions, pastSessions } = useMemo(() => {
    if (!sessions || !sessionTypes || !timeSlots) return { upcomingSessions: [], pastSessions: [] };

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

    const allMerged = sessions
      .map(session => {
        const sessionType = sessionTypeMap.get(session.sessionTypeId);
        const timeSlot = timeSlotMap.get(session.timeSlotId);
        if (!sessionType || !timeSlot) return null;
        return { ...session, sessionType, timeSlot };
      })
      .filter((s): s is MergedSession => s !== null)
      .sort((a, b) => b.timeSlot.startTime.toMillis() - a.timeSlot.startTime.toMillis());
    
    const now = new Date();
    const upcoming = allMerged.filter(s => !isPast(s.timeSlot.endTime.toDate()));
    const past = allMerged.filter(s => isPast(s.timeSlot.endTime.toDate()));

    return { upcomingSessions: [...upcoming].reverse(), pastSessions: past };

  }, [sessions, sessionTypes, timeSlots]);


  const isLoading = isUserLoading || isLoadingSessions || isLoadingSessionTypes || isLoadingTimeSlots || !dict;

  if (isLoading || !bookingsDict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  const SessionCard = ({ session }: { session: MergedSession }) => {
      const { sessionType, timeSlot } = session;
      const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
      const startTime = timeSlot.startTime.toDate();
      const isUpcoming = !isPast(startTime);

      return (
        <Card key={session.id} className="flex flex-col">
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
                       <Link href={`/${lang}/session/${session.id}`}>
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
                {upcomingSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {upcomingSessions.map(session => <SessionCard key={session.id} session={session} />)}
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
                {pastSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pastSessions.map(session => <SessionCard key={session.id} session={session} />)}
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
