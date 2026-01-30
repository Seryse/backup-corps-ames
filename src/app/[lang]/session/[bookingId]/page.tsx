'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Play, Music, Mic, Headphones, Square, Video, Settings } from 'lucide-react';
import RealtimeSubtitles from '@/components/session/realtime-subtitles';
import FileLister from '@/components/admin/file-lister';
import AudioEngine from '@/components/session/AudioEngine';
import TestimonialModal from '@/components/session/TestimonialModal';
import { updateSessionState } from '@/app/actions';
import { adminEmails } from '@/lib/config';
import { LiveSession, Booking } from '@/lib/types';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';


export default function LiveSessionPage({ params }: { params: Promise<{ lang: Locale, bookingId: string }> }) {
  const { lang, bookingId } = use(params);
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [isAdminView, setIsAdminView] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('pending');
  const [isTestimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);

  // --- Data Fetching ---
  const bookingRef = useMemoFirebase(() => {
    if (!firestore || !bookingId) return null;
    return doc(firestore, 'bookings', bookingId) as DocumentReference<Booking>;
  }, [firestore, bookingId]);

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
    if (isUserLoading || isLoadingBooking) return;

    const isUserAdmin = user?.email && adminEmails.includes(user.email);
    setIsAdminView(!!isUserAdmin);

    if (!booking) {
      if (!isLoadingBooking) { // Only set to unauthorized if loading is finished
        setAuthStatus('unauthorized');
      }
      return;
    }
    
    // An admin can view any session. A user can only view their own.
    if (isUserAdmin || (user && booking.userId === user.uid)) {
        setAuthStatus('authorized');
    } else {
        setAuthStatus('unauthorized');
    }
  }, [user, isUserLoading, isLoadingBooking, booking]);


  useEffect(() => {
      if (isAdminView && authStatus === 'authorized' && firestore && user && booking) {
          const sessionRef = doc(firestore, 'sessions', bookingId);
          setDoc(sessionRef, { 
              hostId: user.uid, 
              bookingId: bookingId, 
              status: 'WAITING',
              userId: booking.userId
          }, { merge: true });
      }
  },[isAdminView, authStatus, firestore, bookingId, user, booking])

  // --- Daily.co SDK Integration ---
  useEffect(() => {
    if (authStatus !== 'authorized' || !callFrameRef.current || dailyRef.current) return;

    const setupCall = async () => {
        const roomUrl = "https://corps-et-ames.daily.co/corps-et-ames";
        const callObject = DailyIframe.createFrame(callFrameRef.current, {
            url: roomUrl,
            showLeaveButton: true,
            iframeStyle: { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', border: '0' },
        });
        dailyRef.current = callObject;

        const handleJoined = () => setParticipants(Object.values(callObject.participants()));
        const handleParticipantJoined = (event: any) => setParticipants(prev => [...prev, event.participant]);
        const handleParticipantLeft = (event: any) => setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
        const handleLeftMeeting = () => {
            if (!isAdminView) setTestimonialModalOpen(true);
            else router.push(`/${lang}/dashboard`);
        };

        callObject
            .on('joined-meeting', handleJoined)
            .on('participant-joined', handleParticipantJoined)
            .on('participant-left', handleParticipantLeft)
            .on('left-meeting', handleLeftMeeting);
        
        try {
            await callObject.join();
        } catch (error) {
            console.error("Failed to join Daily.co call:", error);
        }
    };
    setupCall();
    
    return () => {
        if (dailyRef.current) {
            dailyRef.current.destroy();
            dailyRef.current = null;
        }
    }
  }, [authStatus, isAdminView, lang, router]);

  // --- Anti-Ducking Logic ---
  useEffect(() => {
    const callObject = dailyRef.current;
    if (!callObject || isAdminView) return; // Logic is for clients only

    const remoteParticipants = participants.filter(p => !p.local);
    const shouldMuteRemote = sessionState?.status === 'INTRO';

    remoteParticipants.forEach(p => {
      callObject.updateParticipant(p.session_id, { setAudio: !shouldMuteRemote });
    });
  }, [sessionState?.status, participants, isAdminView]);


  // --- Admin Controls ---
  const handleStateChange = (status: LiveSession['status']) => {
    const data: Partial<LiveSession> = { status };
    if(status === 'INTRO' || status === 'HEALING') {
        data.startTime = serverTimestamp();
        data.lang = lang;
    }
    updateSessionState(bookingId, data);
  };
  const handlePlaylistSelect = (url: string) => updateSessionState(bookingId, { status: 'HEALING', activePlaylistUrl: url, startTime: serverTimestamp() });

  const showSubtitles = isAdminView || sessionState?.status === 'INTRO' || sessionState?.status === 'OUTRO';

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
        <AudioEngine sessionState={sessionState ?? null} lang={lang} isAdmin={isAdminView} />
        
        <div className="lg:col-span-2">
            <Card className="h-full">
                 <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Video className="h-6 w-6"/>{dict?.title || 'Live Session'}</span>
                      {sessionState?.status && <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">{sessionState.status}</span>}
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
                            <Settings className="h-5 w-5"/> Session Control
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => handleStateChange('INTRO')} disabled={sessionState?.status === 'INTRO'}><Play className="mr-2"/> Start Intro</Button>
                            <Button onClick={() => handleStateChange('OUTRO')} disabled={sessionState?.status === 'OUTRO'} variant="destructive"><Square className="mr-2"/> End Session</Button>
                        </div>
                        <FileLister 
                            title="Playlists (Starts Healing)" 
                            path="/playlists" 
                            icon={Music} 
                            noFilesFoundText="No playlists found."
                            onFileClick={handlePlaylistSelect}
                        />
                    </CardContent>
                </Card>
            )}
             {showSubtitles && <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdminView} sessionId={bookingId} sessionState={sessionState} />}
        </div>

        {user && booking && <TestimonialModal isOpen={isTestimonialModalOpen} onClose={() => { setTestimonialModalOpen(false); router.push(`/${lang}/dashboard`); }} bookingId={booking.id} userId={user.uid} />}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-8 flex-grow flex flex-col">
       {renderContent()}
    </div>
  );
}
