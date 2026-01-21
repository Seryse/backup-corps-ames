'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Play, Music, Mic, Headphones } from 'lucide-react';
import RealtimeSubtitles from '@/components/session/realtime-subtitles';

type Booking = {
    id: string;
    userId: string;
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any;
    status: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;
};

const adminUids = ['HvsOFzrOwFTHWTBVBextpZtV5I53'];

export default function LiveSessionPage({ params: { lang, bookingId } }: { params: { lang: Locale, bookingId: string } }) {
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isAdminView, setIsAdminView] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('pending');

  const bookingRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'bookings', bookingId) as DocumentReference<Booking>;
  }, [firestore, user, bookingId]);

  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.session));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading || isLoadingBooking) return;

    if (!user) {
      setAuthStatus('unauthorized');
      return;
    }

    const isUserAdmin = adminUids.includes(user.uid);
    setIsAdminView(isUserAdmin);

    if (isUserAdmin) {
      // Admin can access any session for moderation
      setAuthStatus('authorized');
      return;
    }

    if (booking && booking.userId === user.uid && booking.visioToken === token) {
      setAuthStatus('authorized');
    } else {
      setAuthStatus('unauthorized');
    }
  }, [user, isUserLoading, booking, isLoadingBooking, token]);

  const renderContent = () => {
    if (authStatus === 'pending' || isUserLoading || isLoadingBooking || !dict) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="text-muted-foreground">{dict?.loading || 'Loading...'}</p>
        </div>
      );
    }

    if (authStatus === 'unauthorized') {
      return (
        <Card className="max-w-md mx-auto">
            <CardHeader className="items-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <CardTitle className="text-center">{dict?.accessDenied || 'Access Denied'}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">
                    {dict?.accessDeniedMessage || "You don't have permission to view this session or the link is invalid."}
                </p>
            </CardContent>
        </Card>
      );
    }
    
    // Authorized View
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card className="h-full">
                 <CardHeader>
                    <CardTitle>{dict?.title || 'Live Session'}</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div id="jitsi-container" className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                       <p className="text-muted-foreground">Jitsi Video Conference will be mounted here.</p>
                    </div>
                 </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
            {isAdminView && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-headline">
                            <Mic className="h-5 w-5"/>
                            Admin Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline"><Play className="mr-2"/> Play Intro</Button>
                        <Button variant="outline"><Music className="mr-2"/> Play Playlist</Button>
                        <Button variant="destructive" className="col-span-2"><Headphones className="mr-2"/> Stop Audio</Button>
                    </CardContent>
                </Card>
            )}
             <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdminView} />
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-8 flex-grow flex flex-col">
       {renderContent()}
    </div>
  );
}
