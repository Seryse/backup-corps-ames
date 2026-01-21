'use client';

import React, { useState, useEffect, useRef } from 'react';
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

const adminUids = ['HvsOFzrOwFTHWTBVBextpZtV5I53'];

export default function LiveSessionPage({ params: { lang, bookingId } }: { params: { lang: Locale, bookingId: string } }) {
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isAdminView, setIsAdminView] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('pending');
  const [isTestimonialModalOpen, setTestimonialModalOpen] = useState(false);
  
  // --- Video Call State ---
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);

  // This is a workaround for the fact that an admin might not be the booking owner.
  // In a real app, you'd likely have a separate way for admins to look up user bookings.
  const [bookingOwnerId, setBookingOwnerId] = useState<string | null>(null);

  const bookingRef = useMemoFirebase(() => {
    // We need a userId to look up the booking.
    // If we're an admin, we don't know it yet. If we are a user, it's our own UID.
    const userIdForBooking = isAdminView ? bookingOwnerId : user?.uid;
    if (!firestore || !userIdForBooking) return null;
    return doc(firestore, 'users', userIdForBooking, 'bookings', bookingId) as DocumentReference<Booking>;
  }, [firestore, user, bookingId, isAdminView, bookingOwnerId]);

  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

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
    if (isUserLoading) return;
    if (!user) {
      setAuthStatus('unauthorized');
      return;
    }

    const isUserAdmin = adminUids.includes(user.uid);
    setIsAdminView(isUserAdmin);

    if(isUserAdmin){
        // For an admin, we can't know the user ID from the booking easily.
        // This is a simplification: we'll assume the admin can join any session.
        // A production app would need a more secure way to look up the session & user.
        setAuthStatus('authorized');
    } else {
        // For a regular user, we know their ID, so we can set it to fetch the booking.
        setBookingOwnerId(user.uid);
    }
  }, [user, isUserLoading]);
  
  useEffect(()=>{
    if(isAdminView || authStatus === 'authorized') return; // Admin is already authorized.
    if(isLoadingBooking || isUserLoading) return;
    
    if(booking && user && booking.userId === user.uid && booking.visioToken === token){
      setAuthStatus('authorized');
    } else if (!isLoadingBooking) {
      setAuthStatus('unauthorized');
    }
  },[booking, isLoadingBooking, isUserLoading, token, user, isAdminView, authStatus])

  useEffect(() => {
      // If admin, ensure the session document exists when authorized
      if (isAdminView && authStatus === 'authorized' && firestore) {
          const sessionRef = doc(firestore, 'sessions', bookingId);
          setDoc(sessionRef, { hostId: user?.uid, bookingId }, { merge: true });
      }
  },[isAdminView, authStatus, firestore, bookingId, user])

  // --- Daily.co SDK Integration ---
  useEffect(() => {
    if (authStatus !== 'authorized' || !callFrameRef.current || dailyRef.current || !booking) return;

    const setupCall = async () => {
        // =================================================================
        // IMPORTANT: Replace this with your actual Daily.co room URL
        // You can create one for free at https://www.daily.co/
        const roomUrl = "https://your-domain.daily.co/your-room";
        // =================================================================
        
        const DailyIframe = (await import('@daily-co/daily-js')).default;
        
        const callObject = DailyIframe.createFrame(callFrameRef.current!, {
            showLeaveButton: true,
            iframeStyle: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                border: '0',
            },
            audioSource: false, 
            subscribeToTracksAutomatically: true,
        });
        
        dailyRef.current = callObject;

        callObject.on('track-started', (event) => {
            if (event.track.kind === 'audio' && event.participant.owner) {
                console.log("Admin audio track started, creating stream for AudioEngine.");
                const stream = new MediaStream([event.track]);
                setRemoteAudioStream(stream); 
            }
        });

        callObject.on('left-meeting', () => {
            console.log('Left meeting');
            callObject.destroy();
            dailyRef.current = null;
            if (!isAdminView) {
                setTestimonialModalOpen(true);
            } else {
                router.push(`/${lang}/dashboard`);
            }
        });

        // Use the visioToken from the booking for secure access
        await callObject.join({ url: roomUrl, token: booking.visioToken });
    };

    setupCall();
    
    return () => {
        dailyRef.current?.destroy();
        dailyRef.current = null;
    }
  }, [authStatus, isAdminView, lang, router, booking]);

  const handleTriggerIntro = () => updateSessionState(bookingId, { triggerIntro: true });
  const handleStopAudio = () => { /* Logic to stop playlist via session state */ };
  const handleMuteAll = () => {
      console.log("Mute All clicked - implementation pending via Daily.co SDK.");
  };

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
            remoteStream={remoteAudioStream}
            introUrl={`https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.appspot.com/o/intros%2Fintro_${lang}.mp3?alt=media`}
            triggerIntro={sessionState?.triggerIntro}
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
                            <Mic className="h-5 w-5"/> Admin Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleTriggerIntro} variant="outline" className="w-full"><Play className="mr-2"/> Play Intro</Button>
                        <Button onClick={handleMuteAll} variant="outline" className="w-full"><VolumeX className="mr-2"/> Mute All</Button>
                        <FileLister title="Intros" path="/intros" icon={Play} noFilesFoundText="No intro files found." />
                        <FileLister title="Playlists" path="/playlists" icon={Music} noFilesFoundText="No playlists found." />
                        {/* TODO: Clicking a playlist file should call updateSessionState with the file URL */}
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
