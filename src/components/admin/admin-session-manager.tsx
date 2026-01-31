'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, isPast, isToday } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Query } from 'firebase/firestore'; 
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Calendar, Clock, Users, Link as LinkIcon, BookHeart, Download } from 'lucide-react';
import type { SessionType } from '@/components/admin/session-type-manager';
import type { LiveSession, MergedSession, TimeSlot } from '@/lib/types';
import { GrimoireUploadDialog } from './GrimoireUploadDialog';

type UserProfile = {
    id: string;
    displayName?: string;
    email?: string;
};

type AdminMergedSession = MergedSession & {
    user: UserProfile;
}

export default function AdminSessionManager({ lang, dictionary }: { lang: Locale, dictionary: any }) {
  const firestore = useFirestore();

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || enUS;

  // --- Data Fetching ---
  const sessionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sessions')) as Query<LiveSession>;
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

  const { data: sessions, isLoading: isLoadingSessions } = useCollection<LiveSession>(sessionsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const { todaysSessions, pastSessions } = useMemo(() => {
    // Si les données de base ne sont pas là, on renvoie vide
    if (!sessions || !sessionTypes || !timeSlots) return { todaysSessions: [], pastSessions: [] };

    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));
    
    // On crée la Map des users seulement si 'users' est chargé, sinon Map vide
    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    const allMerged = sessions
      .map(session => {
        const sessionType = sessionTypeMap.get(session.sessionTypeId);
        const timeSlot = timeSlotMap.get(session.timeSlotId);
        const user = userMap.get(session.userId);
        
        // MODIFICATION ICI : On ne bloque QUE si le Type ou le Slot manque (intégrité technique).
        // Si l'utilisateur manque (bug d'affichage ou chargement), on affiche quand même la séance.
        if (!sessionType || !timeSlot) return null;

        // Si l'user n'est pas trouvé dans la map, on crée un objet temporaire pour l'affichage
        const effectiveUser = user || { 
            id: session.userId, 
            displayName: 'Utilisateur non chargé', 
            email: 'N/A' 
        };
        
        return { ...session, sessionType, timeSlot, user: effectiveUser };
      })
      .filter((s): s is AdminMergedSession => s !== null);
    
    // TRI JAVASCRIPT
    const todays = allMerged.filter(s => {
        const startTime = s.timeSlot.startTime.toDate();
        return isToday(startTime);
    }).sort((a,b) => a.timeSlot.startTime.toMillis() - b.timeSlot.startTime.toMillis());

    const past = allMerged.filter(s => {
        const endTime = s.timeSlot.endTime.toDate();
        return isPast(endTime) && !isToday(s.timeSlot.startTime.toDate());
    }).sort((a,b) => b.timeSlot.startTime.toMillis() - a.timeSlot.startTime.toMillis());

    return { todaysSessions: todays, pastSessions: past };
  }, [sessions, sessionTypes, timeSlots, users]);

  const isLoading = isLoadingSessions || isLoadingSessionTypes || isLoadingTimeSlots || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }
  
  const SessionCard = ({ session }: { session: AdminMergedSession }) => {
    const { sessionType, timeSlot, user } = session;
    const localizedName = sessionType.name?.[lang] || sessionType.name?.en;
    const startTime = timeSlot.startTime.toDate();
    const sessionHasEnded = isPast(timeSlot.endTime.toDate());

    // Pour l'admin, on affiche le grimoire pour TOUT le monde (pas de restriction de catégorie)
    // Comme ça, si une faute de frappe traîne dans la DB, le bouton est quand même là.
    const isGrimoireEligible = true;
    
    const userIdentifier = user.displayName || user.email || session.userId;

    return (
        <Card key={session.id} className="flex flex-col">
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
                    <span className="font-semibold text-foreground">{userIdentifier}</span>
                </div>
                {isGrimoireEligible && (
                    <div className="pt-2">
                        {session.reportStatus === 'available' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 mb-2">
                                {dictionary.admin?.grimoire?.report_sent || "Rapport envoyé"}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="mb-2 text-muted-foreground">
                                En attente
                            </Badge>
                        )}
                        
                        <div className="relative aspect-[3/4] w-24 bg-muted rounded-md flex items-center justify-center border shadow-sm">
                            {session.pdfThumbnail ? (
                                <Image src={session.pdfThumbnail} alt="Grimoire thumbnail" fill className="object-cover rounded-md" />
                            ) : (
                                <BookHeart className="h-8 w-8 text-muted-foreground/50" />
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2">
                <Button asChild className="w-full" variant="outline">
                    <Link href={`/${lang}/session/${session.id}`}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {dictionary.admin?.joinCall || "Rejoindre"}
                    </Link>
                </Button>

                {sessionHasEnded && isGrimoireEligible && (
                    <>
                        {session.reportStatus === 'available' && session.pdfUrl && (
                             <Button asChild variant="secondary" size="sm">
                               <a href={session.pdfUrl} download target="_blank" rel="noopener noreferrer">
                                 <Download className="mr-2 h-4 w-4" />
                                 {dictionary.admin?.grimoire?.download_button || 'Télécharger'}
                               </a>
                            </Button>
                        )}
                        <GrimoireUploadDialog session={session} dictionary={dictionary} />
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
                <h2 className="text-3xl font-headline">{dictionary.admin?.todaysSessions || "Séances du jour"}</h2>
            </div>
            {todaysSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {todaysSessions.map(session => <SessionCard key={session.id} session={session} />)}
            </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-background/50">
                    <Calendar className="mx-auto h-16 w-16 text-muted-foreground/50" />
                    <h2 className="mt-6 text-2xl font-headline text-muted-foreground">{dictionary.admin?.noSessionsToday || "Aucune séance aujourd'hui"}</h2>
                </div>
            )}
        </div>
        
        {/* On affiche la section Historique même si vide pour débugger visuellement */}
        <div>
            <div className="flex items-center gap-4 mb-8 pt-8 border-t">
                <Calendar className="h-8 w-8 text-accent" />
                <h2 className="text-3xl font-headline">{dictionary.admin?.pastSessions || "Historique"}</h2>
            </div>
            {pastSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pastSessions.map(session => <SessionCard key={session.id} session={session} />)}
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aucune séance passée trouvée (ou problème d&apos;affichage).</p>
                </div>
            )}
        </div>
    </section>
  );
}