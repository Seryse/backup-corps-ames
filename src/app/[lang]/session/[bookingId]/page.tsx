'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, DocumentReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Play, Music, Mic, Headphones, VolumeX, Video } from 'lucide-react';
import RealtimeSubtitles from '@/components/session/realtime-subtitles';
import FileLister from '@/components/admin/file-lister';
import AudioEngine from '@/components/session/AudioEngine';
import TestimonialModal from '@/components/session/TestimonialModal';
import { updateSessionState } from '@/app/actions';

// From backend.json
type Booking = {
    id: string;
    userId: string;
    timeSlotId: string;
    sessionTypeId: string;
    bookingTime: any;
    status: 'confirmed' | 'pending' | 'cancelled';
    visioToken: string;
};

// This should match the LiveSession entity in backend.json
interface LiveSession {
    id: string;
    triggerIntro?: boolean;
    activePlaylistUrl?: string;
    hostId: string;
}

// Simplified Daily.co call object
type DailyCall = any;

const adminEmails = ['seryse@live.be', 'jael@live.fr', 'selvura@gmail.com'];

export default function LiveSessionPage({ params }: { params: Promise<{ lang: Locale, bookingId: string }> }) {
  const { lang, bookingId } = use(params);
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAdminView, setIsAdminView] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('pending');
  const [isTestimonialModalOpen, setTestimonialModalOpen] = useState(false);
  
  // --- Video Call State ---
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);
  const hasJoinedRef = useRef(false); // Lock to prevent re-joining

  // --- Data Fetching ---
    const bookingRef = useMemoFirebase(() => {
        if (!firestore || !user || isUserLoading) return null;

        let userIdForBooking: string | null = null;
        const isUserAdmin = user.email && adminEmails.includes(user.email);
        
        if (isUserAdmin) {
            userIdForBooking = searchParams.get('uid');
        } else {
            userIdForBooking = user.uid;
        }
        
        if (!userIdForBooking) return null;
        
        return doc(firestore, 'users', userIdForBooking, 'bookings', bookingId) as DocumentReference<Booking>;
    }, [firestore, user, isUserLoading, bookingId, searchParams]);

  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  const bookingExists = !!booking;
  const bookingUserId = booking?.userId;

  const sessionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sessions', bookingId) as DocumentReference<LiveSession>;
  }, [firestore, bookingId]);

  const { data: sessionState } = useDoc<LiveSession>(sessionRef);


  // --- Authorization and Session Setup ---
  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.session));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading || isLoadingBooking) {
      setAuthStatus('pending');
      return;
    }

    if (!user) {
      setAuthStatus('unauthorized');
      return;
    }
    
    const isUserAdmin = user.email && adminEmails.includes(user.email);
    setIsAdminView(isUserAdmin);

    if (isUserAdmin) {
      if (bookingExists) {
        setAuthStatus('authorized');
      } else {
        setAuthStatus('unauthorized');
      }
    } else {
      if (bookingExists && bookingUserId === user.uid) {
        setAuthStatus('authorized');
      } else {
        setAuthStatus('unauthorized');
      }
    }
  }, [user, isUserLoading, isLoadingBooking, bookingExists, bookingUserId]);


  useEffect(() => {
      if (isAdminView && authStatus === 'authorized' && firestore && user) {
          const sessionRef = doc(firestore, 'sessions', bookingId);
          setDoc(sessionRef, { hostId: user.uid, bookingId }, { merge: true });
      }
  },[isAdminView, authStatus, firestore, bookingId, user])

  // --- Daily.co SDK Integration ---
  useEffect(() => {
    if (authStatus !== 'authorized' || !callFrameRef.current || hasJoinedRef.current) return;

    const setupCall = async () => {
        const roomUrl = "https://corps-et-ames.daily.co/corps-et-ames";
        const DailyIframe = (await import('@daily-co/daily-js')).default;
        
        const dailyOptions: any = {
            url: roomUrl,
            showLeaveButton: true,
            iframeStyle: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                border: '0',
            },
            videoSource: true,
            // Admin sends audio, client does not. Client receives audio from the call regardless.
            audioSource: isAdminView,
        };

        const callObject = DailyIframe.createFrame(callFrameRef.current!, dailyOptions);
        
        dailyRef.current = callObject;

        callObject.on('left-meeting', () => {
            if(dailyRef.current) {
                dailyRef.current.destroy();
            }
            dailyRef.current = null;
            hasJoinedRef.current = false;
            if (!isAdminView) {
                setTestimonialModalOpen(true);
            } else {
                router.push(`/${lang}/dashboard`);
            }
        });

        try {
            // Only attempt to join AFTER event listeners are set up
            await callObject.join();
            hasJoinedRef.current = true; // Lock to prevent re-joining AFTER successful join
        } catch (error) {
            console.error("Failed to join Daily.co call:", error);
            // On failure, destroy the instance and reset the lock to allow retries
            if(dailyRef.current) {
                dailyRef.current.destroy();
                dailyRef.current = null;
            }
            hasJoinedRef.current = false;
        }
    };

    setupCall();
    
    // Cleanup function
    return () => {
        if (dailyRef.current) {
            dailyRef.current.destroy();
            dailyRef.current = null;
        }
        hasJoinedRef.current = false;
    }
  }, [authStatus, isAdminView, lang, router]);

  const handleTriggerIntro = () => updateSessionState(bookingId, { triggerIntro: true, activePlaylistUrl: '' });
  const handlePlaylistSelect = (url: string) => updateSessionState(bookingId, { activePlaylistUrl: url, triggerIntro: false });

  const renderContent = () => {
    if (authStatus === 'pending' || !dict) {
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
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isAdminView && <AudioEngine 
            introUrl={`https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.appspot.com/o/intros%2Fintro_${lang}.mp3?alt=media`}
            triggerIntro={sessionState?.triggerIntro}
            playlistUrl={sessionState?.activePlaylistUrl}
        />}

        <div className="lg:col-span-2">
            <Card className="h-full">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-6 w-6"/>
                      {dict?.title || 'Live Session'}
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div ref={callFrameRef} className="w-full aspect-video bg-muted rounded-lg relative">
                       {/* Daily.co iframe will be mounted here */}
                    </div>
                 </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
            {isAdminView && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-headline">
                            <Music className="h-5 w-5"/> Audio Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleTriggerIntro} variant="outline" className="w-full"><Play className="mr-2"/> Play Intro</Button>
                        <FileLister 
                            title="Playlists" 
                            path="/playlists" 
                            icon={Music} 
                            noFilesFoundText="No playlists found."
                            onFileClick={handlePlaylistSelect}
                        />
                    </CardContent>
                </Card>
            )}
             <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdminView} sessionId={bookingId} />
        </div>

        {user && <TestimonialModal isOpen={isTestimonialModalOpen} onClose={() => { setTestimonialModalOpen(false); router.push(`/${lang}/dashboard`); }} bookingId={bookingId} userId={user.uid} />}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-8 flex-grow flex flex-col">
       {renderContent()}
    </div>
  );
}
