'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, DocumentReference, updateDoc } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, AlertTriangle, Music, Video,
  Settings, Mic, Volume2, Clock, Radio, PhoneCall, Users
} from 'lucide-react';
import { isSameDay, format } from 'date-fns';

import RealtimeSubtitles from '@/components/session/realtime-subtitles';
import TestimonialModal from '@/components/session/TestimonialModal';
import { PractitionerFeed } from '@/components/session/IrisphereFeeds';
import ParticipantGrid from '@/components/session/ParticipantGrid';

import { adminEmails } from '@/lib/config';
import { LiveSession, TimeSlot } from '@/lib/types';
import { useStreamMixer } from '@/hooks/useStreamMixer';
import { useIrisphereSession } from '@/hooks/useIrisphereSession';
import { useParticipants } from '@/hooks/useParticipants';

type Playlist = { id: string; title: string; url: string };
type SessionMode = 'EXCHANGE' | 'INTRO' | 'HEALING' | 'OUTRO';

const INTRO_DURATION_SECONDS = 420;
const COUNTDOWN_SECONDS = 10;

const getIntroUrl = (lang: Locale) =>
  `https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.firebasestorage.app/o/intros%2Fintro_${lang}.mp3?alt=media`;

export default function LiveSessionPage({
  params,
}: {
  params: Promise<{ lang: Locale; bookingId: string }>;
}) {
  const { lang, bookingId: sessionId } = use(params);
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isAdminView, setIsAdminView] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('pending');
  const [isTestimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [cloudPlaylists, setCloudPlaylists] = useState<Playlist[]>([]);
  const [isStorageLoading, setIsStorageLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState<SessionMode>('EXCHANGE');

  // ✅ Countdown — côté client uniquement (10s avant intro audio)
  // Côté praticien — affichage "En attente des clients" pendant ce délai
  const [countdown, setCountdown] = useState<number | null>(null);
  const [adminWaiting, setAdminWaiting] = useState(false); // praticien voit les caméras s'allumer
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const adminWaitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clientIntroRef = useRef<HTMLAudioElement | null>(null);
  const [clientIntroPlaying, setClientIntroPlaying] = useState(false);
  const introStartedRef = useRef(false);

  const autoChainTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const isTestMode = searchParams.get('test') === 'true';

  // ── Playlists ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const storage = getStorage(undefined, 'gs://corps-et-ames-adc60.firebasestorage.app');
        const listRef = ref(storage, 'playlists');
        const res = await listAll(listRef);
        const items = await Promise.all(
          res.items.map(async (item) => ({
            id: item.name,
            title: item.name.replace('.mp3', '').replace(/_/g, ' '),
            url: await getDownloadURL(item),
          }))
        );
        setCloudPlaylists(items);
      } catch (e) {
        console.error('Erreur Storage:', e);
      } finally {
        setIsStorageLoading(false);
      }
    };
    fetchMusic();
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const sessionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sessions', sessionId) as DocumentReference<LiveSession>;
  }, [firestore, sessionId]);

  const { data: sessionState, isLoading: isLoadingSession } = useDoc<LiveSession>(sessionRef);

  const timeSlotRef = useMemoFirebase(() => {
    if (!firestore || !sessionState?.timeSlotId) return null;
    return doc(firestore, 'timeSlots', sessionState.timeSlotId) as DocumentReference<TimeSlot>;
  }, [firestore, sessionState]);

  const { data: timeSlot, isLoading: isLoadingTimeSlot } = useDoc<TimeSlot>(timeSlotRef);

  const practitionerCfSessionId = (sessionState as any)?.cfPractitionerSessionId ?? null;
  const timeSlotId = sessionState?.timeSlotId ?? sessionId;

  // ── Studio & caméra praticien ──────────────────────────────────────────────
  const { mixedAudioTrack, startStudio, isReady } = useStreamMixer(
    isAdminView ? (sessionState ?? null) : null,
    lang
  );

  const [practitionerVideoTrack, setPractitionerVideoTrack] = useState<MediaStreamTrack | null>(null);

  const startPractitionerCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      setPractitionerVideoTrack(stream.getVideoTracks()[0]);
    } catch (e) {
      console.error('Erreur caméra praticien:', e);
    }
  };

  // ── SFU ────────────────────────────────────────────────────────────────────
  const {
    isConnected: isSFUConnected,
    isConnecting: isSFUConnecting,
    error: sfuError,
    practitionerStream,
    cfSessionId,
    startBroadcast,
    stopBroadcast,
    startClientCamera,
    stopClientCamera,
    clientCameraActive,
  } = useIrisphereSession({
    role: isAdminView ? 'practitioner' : 'client',
    timeSlotId,
    mixedAudioTrack: isAdminView ? mixedAudioTrack : undefined,
    videoTrack: isAdminView ? practitionerVideoTrack : undefined,
    practitionerCfSessionId: !isAdminView ? practitionerCfSessionId : undefined,
  });

  // ✅ Sauvegarder cfSessionId praticien dans Firebase
  useEffect(() => {
    if (!isAdminView || !cfSessionId || !sessionRef) return;
    updateDoc(sessionRef, { cfPractitionerSessionId: cfSessionId })
      .then(() => console.log(`✅ CF sessionId praticien sauvegardé: ${cfSessionId}`))
      .catch(e => console.error('Erreur save cfSessionId:', e));
  }, [cfSessionId, isAdminView, sessionRef]);

  // ── Participants ───────────────────────────────────────────────────────────
  const { participants, publishCamera, unpublishCamera } = useParticipants({
    sessionId,
    timeSlotId,
    isAdmin: isAdminView,
    userId: user?.uid ?? null,
    displayName: user?.displayName ?? 'Voyageur',
  });

  useEffect(() => {
    if (!isAdminView && clientCameraActive && cfSessionId && timeSlotId) {
      const trackName = `${timeSlotId}_client_${cfSessionId}_video`;
      publishCamera(cfSessionId, trackName);
    }
    return () => {
      if (!isAdminView && clientCameraActive) unpublishCamera();
    };
  }, [clientCameraActive, cfSessionId]);

  // ✅ Auto-connect client quand practitionerCfSessionId disponible
  useEffect(() => {
    if (isAdminView) return;
    if (!practitionerCfSessionId) return;
    const mode = sessionState?.sessionStatus;
    if ((mode === 'INTRO' || mode === 'HEALING') && !isSFUConnected && !isSFUConnecting) {
      console.log('🔗 practitionerCfSessionId disponible — connexion client...');
      startClientCamera();
    }
  }, [practitionerCfSessionId, sessionState?.sessionStatus]);

  // ✅ Countdown CLIENT — l'intro audio démarre APRÈS les 10s
  const startClientIntro = useCallback(() => {
    if (introStartedRef.current || isAdminView) return;
    introStartedRef.current = true;

    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        setCountdown(null);

        // ✅ Intro démarre exactement après le countdown
        if (!clientIntroRef.current) {
          clientIntroRef.current = new Audio(getIntroUrl(lang));
          clientIntroRef.current.crossOrigin = 'anonymous';
        }
        const intro = clientIntroRef.current;
        intro.currentTime = 0; // on repart du début car le countdown = le délai
        intro.play()
          .then(() => setClientIntroPlaying(true))
          .catch(e => console.error('Intro play error:', e));
      }
    }, 1000);
  }, [lang, isAdminView]);

  // ✅ Délai praticien — affiche "En attente" pendant le countdown client
  const startAdminWaiting = useCallback(() => {
    setAdminWaiting(true);
    adminWaitTimerRef.current = setTimeout(() => {
      setAdminWaiting(false);
    }, COUNTDOWN_SECONDS * 1000);
  }, []);

  // ── Auto-enchaînement intro → playlist ────────────────────────────────────
  const scheduleAutoChain = useCallback((playlistUrl: string) => {
    if (autoChainTimerRef.current) clearTimeout(autoChainTimerRef.current);
    // ✅ INTRO_DURATION_SECONDS + COUNTDOWN_SECONDS car l'intro démarre après le countdown
    const totalDuration = (INTRO_DURATION_SECONDS + COUNTDOWN_SECONDS) * 1000;
    console.log(`⏱ Auto-enchaînement dans ${INTRO_DURATION_SECONDS + COUNTDOWN_SECONDS}s`);
    autoChainTimerRef.current = setTimeout(async () => {
      if (!sessionRef) return;
      await updateDoc(sessionRef, {
        sessionStatus: 'HEALING',
        activePlaylistUrl: playlistUrl,
        startTime: serverTimestamp(),
      });
      console.log('✅ Enchaînement automatique intro → playlist');
    }, totalDuration);
  }, [sessionRef]);

  // ── Sync Firebase ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionState) return;
    const status = sessionState.sessionStatus;

    if (status === 'INTRO') {
      setSessionMode('INTRO');
      if (!isAdminView) {
        startClientIntro();
      } else {
        startAdminWaiting();
      }

    } else if (status === 'HEALING') {
      setSessionMode('HEALING');
      setAdminWaiting(false);
      if (clientIntroRef.current) {
        clientIntroRef.current.pause();
        setClientIntroPlaying(false);
      }
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);

    } else if (status === 'OUTRO') {
      setSessionMode('OUTRO');
      setAdminWaiting(false);
      if (isAdminView && isSFUConnected) stopBroadcast();
      if (!isAdminView) { stopClientCamera(); unpublishCamera(); }
      if (clientIntroRef.current) {
        clientIntroRef.current.pause();
        setClientIntroPlaying(false);
      }
      if (autoChainTimerRef.current) clearTimeout(autoChainTimerRef.current);
      if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
      introStartedRef.current = false;

    } else {
      setSessionMode('EXCHANGE');
      setAdminWaiting(false);
      introStartedRef.current = false;
      if (!isAdminView) { stopClientCamera(); unpublishCamera(); }
      if (clientIntroRef.current) {
        clientIntroRef.current.pause();
        setClientIntroPlaying(false);
      }
      if (autoChainTimerRef.current) clearTimeout(autoChainTimerRef.current);
      if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
    }
  }, [sessionState?.sessionStatus]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    getDictionary(lang).then((d) => setDict(d.session));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading || isLoadingSession) return;
    const isUserAdmin = user?.email && adminEmails.includes(user.email);
    setIsAdminView(!!isUserAdmin);
    if (isTestMode) { setAuthStatus('authorized'); return; }
    if (!sessionState) { if (!isLoadingSession) setAuthStatus('unauthorized'); return; }
    if (isUserAdmin || (user && sessionState.userId === user.uid)) {
      setAuthStatus('authorized');
    } else {
      setAuthStatus('unauthorized');
    }
  }, [user, isUserLoading, isLoadingSession, sessionState, isTestMode]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (autoChainTimerRef.current) clearTimeout(autoChainTimerRef.current);
      if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
      unpublishCamera();
    };
  }, []);

  // ── VDO.Ninja URLs ─────────────────────────────────────────────────────────
  const commonRoomId = `iris_raw_${sessionId.substring(0, 10)}`;
  const userLabel = isAdminView ? 'Accompagnant' : (user?.displayName || 'Voyageur');

  let ninjaExchangeUrl = `https://vdo.ninja/?room=${commonRoomId}&label=${encodeURIComponent(userLabel)}&darkmode&tips=0&autoplay=1&facing=front`;
  if (isAdminView) {
    ninjaExchangeUrl += `&proaudio=1&stereo=1&ad=0&audiobitrate=256&push=master_stream`;
  } else {
    ninjaExchangeUrl += `&view=master_stream&push=client_stream&aq=1&stereo=1`;
  }

  let ninjaOutroUrl = `https://vdo.ninja/?room=${commonRoomId}&label=${encodeURIComponent(userLabel)}&darkmode&tips=0&autoplay=1&facing=front`;
  if (isAdminView) {
    ninjaOutroUrl += `&proaudio=1&stereo=1&director&push=master_stream`;
  } else {
    ninjaOutroUrl += `&view=master_stream&push=client_stream&handraise=1&stereo=1`;
  }

  // ── Actions praticien ──────────────────────────────────────────────────────
  const handleLaunchIntro = async () => {
    if (!sessionRef || !sessionState?.activePlaylistUrl) return;
    if (!isSFUConnected && !isSFUConnecting) await startBroadcast();
    await updateDoc(sessionRef, {
      sessionStatus: 'INTRO',
      startTime: serverTimestamp(),
      lang,
    });
    scheduleAutoChain(sessionState.activePlaylistUrl);
  };

  const handleStateChange = async (status: LiveSession['sessionStatus']) => {
    if (!sessionRef) return;
    if (status === 'OUTRO' || status === 'WAITING') {
      if (isSFUConnected) stopBroadcast();
      if (autoChainTimerRef.current) clearTimeout(autoChainTimerRef.current);
    }
    await updateDoc(sessionRef, {
      sessionStatus: status,
      startTime: ['INTRO', 'HEALING'].includes(status) ? serverTimestamp() : null,
      lang,
    });
  };

  const handlePlaylistSelect = async (url: string) => {
    if (!sessionRef) return;
    await updateDoc(sessionRef, { activePlaylistUrl: url });
  };

  const handleStartStudio = async () => {
    await startStudio();
    await startPractitionerCamera();
  };

  const isInBroadcast = sessionMode === 'INTRO' || sessionMode === 'HEALING';
  const showSubtitles = sessionMode === 'EXCHANGE' || sessionMode === 'OUTRO' || sessionMode === 'INTRO';

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const renderContent = () => {
    const isLoading = authStatus === 'pending' || !dict || isLoadingTimeSlot;

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="text-muted-foreground font-headline text-lg italic">Ouverture de l'Irisphère...</p>
        </div>
      );
    }

    if (authStatus === 'unauthorized') {
      return (
        <Card className="max-w-md mx-auto mt-20 shadow-xl border-destructive/50">
          <CardHeader className="items-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <CardTitle className="text-center">Accès Refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{dict?.accessDeniedMessage}</p>
            <Button className="w-full mt-4" onClick={() => router.push(`/${lang}/dashboard`)}>Dashboard</Button>
          </CardContent>
        </Card>
      );
    }

    if (!isAdminView && timeSlot && !isTestMode) {
      const scheduledDate = timeSlot.startTime.toDate();
      if (!isSameDay(scheduledDate, new Date())) {
        return (
          <Card className="max-w-md mx-auto mt-20 shadow-xl border-accent/20">
            <CardHeader className="items-center text-center">
              <Clock className="h-16 w-16 text-accent mb-4" />
              <CardTitle className="text-2xl font-headline italic">Salle d'Attente</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Votre séance est prévue le :<br />
                <span className="font-semibold text-foreground text-lg">
                  {format(scheduledDate, 'dd/MM/yyyy')} à {format(scheduledDate, 'HH:mm')}
                </span>
              </p>
              <Button variant="outline" className="w-full" onClick={() => router.push(`/${lang}/dashboard`)}>
                Retour au Dashboard
              </Button>
            </CardContent>
          </Card>
        );
      }
    }

    // ✅ Layout responsive — mobile en colonne, desktop en grille
    return (
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 w-full">

        {/* ── ZONE VIDÉO ── */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-2xl bg-black overflow-hidden rounded-2xl flex flex-col"
            style={{ minHeight: '280px', height: 'min(50vh, 480px)' }}>

            {/* Header */}
            <div className="bg-zinc-900/80 p-2 shrink-0 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white font-headline text-sm">
                {sessionMode === 'EXCHANGE' || sessionMode === 'OUTRO'
                  ? <PhoneCall className="h-4 w-4 text-accent" />
                  : <Radio className="h-4 w-4 text-red-400 animate-pulse" />
                }
                <span className="hidden sm:inline">
                  {sessionMode === 'EXCHANGE' && 'Espace d\'Échange'}
                  {sessionMode === 'INTRO' && 'Introduction — Live'}
                  {sessionMode === 'HEALING' && 'Soin en cours — Live'}
                  {sessionMode === 'OUTRO' && 'Débrief'}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {sessionState?.sessionStatus && (
                  <Badge variant="outline" className="border-accent text-accent bg-accent/10 text-xs px-1.5">
                    {sessionState.sessionStatus}
                  </Badge>
                )}
                {isInBroadcast && isSFUConnected && (
                  <Badge variant="outline" className="border-red-400 text-red-400 bg-red-400/10 text-xs px-1.5">
                    ● LIVE
                  </Badge>
                )}
                {!isAdminView && clientIntroPlaying && (
                  <Badge variant="outline" className="border-accent text-accent bg-accent/10 text-xs px-1.5 animate-pulse">
                    ♪
                  </Badge>
                )}
              </div>
            </div>

            {/* Contenu vidéo */}
            <div className="relative flex-1">

              {/* EXCHANGE + OUTRO — VDO.Ninja */}
              {(sessionMode === 'EXCHANGE' || sessionMode === 'OUTRO') && (
                <iframe
                  src={sessionMode === 'OUTRO' ? ninjaOutroUrl : ninjaExchangeUrl}
                  allow="autoplay;camera;microphone;fullscreen"
                  className="absolute inset-0 w-full h-full border-0 bg-zinc-900"
                />
              )}

              {/* INTRO + HEALING côté CLIENT */}
              {isInBroadcast && !isAdminView && (
                <div className="absolute inset-0">
                  {/* ✅ Countdown overlay côté client */}
                  {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90">
                      <p className="text-white/50 text-xs uppercase tracking-widest mb-4">
                        La séance commence dans
                      </p>
                      <div className="text-7xl sm:text-9xl font-bold text-accent tabular-nums">
                        {countdown}
                      </div>
                      <p className="text-white/30 text-xs mt-4">Installez-vous confortablement ✨</p>
                    </div>
                  )}
                  <PractitionerFeed
                    stream={practitionerStream}
                    isConnecting={isSFUConnecting && !practitionerCfSessionId}
                    sessionStatus={sessionState?.sessionStatus}
                  />
                  {sfuError && (
                    <div className="absolute bottom-2 left-2 right-2 bg-destructive/80 text-white text-xs p-2 rounded-lg">
                      {sfuError}
                    </div>
                  )}
                </div>
              )}

              {/* INTRO + HEALING côté PRATICIEN */}
              {isInBroadcast && isAdminView && (
                <div className="absolute inset-0 bg-zinc-950">
                  {/* ✅ Pendant le countdown — affiche "En attente" avec animation */}
                  {adminWaiting ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                      <Users className="h-12 w-12 text-accent animate-pulse" />
                      <p className="text-white/60 text-sm font-headline italic">
                        Les participants se connectent...
                      </p>
                      <p className="text-white/30 text-xs">
                        L'intro démarrera dans {COUNTDOWN_SECONDS}s
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 h-full">
                      <ParticipantGrid participants={participants} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── ZONE CONTRÔLES ── */}
        <div className="lg:h-full overflow-y-auto">
          {isAdminView ? (

            // ── CONSOLE PRATICIEN ────────────────────────────────────────────
            <div className="space-y-3">
              <Card className="border-accent/20 shadow-xl">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-base font-headline text-accent">
                    <Settings className="h-4 w-4" /> Console Irisphère
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3">

                  {!isReady ? (
                    <Button onClick={handleStartStudio}
                      className="w-full bg-amber-600 hover:bg-amber-700 py-5 font-bold text-white">
                      <Mic className="mr-2 h-4 w-4" /> ACTIVER LE STUDIO
                    </Button>
                  ) : (
                    <div className="bg-green-500/10 text-green-600 p-2 rounded text-center text-xs font-bold border border-green-500/20 flex items-center justify-center gap-2">
                      <Volume2 className="h-3 w-3" /> STUDIO CONNECTÉ
                    </div>
                  )}

                  {isInBroadcast && (
                    <div className={`p-2 rounded text-center text-xs font-bold border flex items-center justify-center gap-2 ${
                      isSFUConnected ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : isSFUConnecting ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-muted/30 text-muted-foreground border-muted'
                    }`}>
                      <Radio className="h-3 w-3" />
                      {isSFUConnected ? 'BROADCAST ACTIF' : isSFUConnecting ? 'Connexion...' : 'Inactif'}
                    </div>
                  )}

                  {sfuError && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{sfuError}</p>}

                  {/* 1. Playlists */}
                  <div>
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-2">
                      <Music className="h-3 w-3 text-primary" /> 1. Choisir la playlist
                    </h3>
                    <ScrollArea className="h-36 rounded-xl border p-1.5 bg-muted/30">
                      {isStorageLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4" /></div>
                      ) : cloudPlaylists.length > 0 ? (
                        <div className="space-y-1">
                          {cloudPlaylists.map((pl) => (
                            <div key={pl.id} onClick={() => handlePlaylistSelect(pl.url)}
                              className={`p-2 rounded-lg cursor-pointer transition-all border flex items-center gap-2 text-xs ${
                                sessionState?.activePlaylistUrl === pl.url
                                  ? 'bg-accent/20 border-accent'
                                  : 'bg-background hover:bg-accent/5 border-transparent'
                              }`}>
                              <Radio className={`h-2.5 w-2.5 flex-shrink-0 ${
                                sessionState?.activePlaylistUrl === pl.url ? 'text-accent animate-pulse' : 'text-muted-foreground'
                              }`} />
                              <p className="font-medium truncate">{pl.title}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-center p-4 text-muted-foreground">Dossier playlists vide.</p>
                      )}
                    </ScrollArea>
                  </div>

                  {/* 2. Boutons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={handleLaunchIntro}
                      disabled={!isReady || !sessionState?.activePlaylistUrl || sessionMode === 'INTRO'}
                      variant={sessionMode === 'INTRO' ? 'secondary' : 'default'}
                      className="text-xs">
                      2. Lancer l'Intro
                    </Button>
                    <Button size="sm" onClick={() => handleStateChange('OUTRO')}
                      variant="outline" className="text-destructive border-destructive text-xs">
                      Fin de soin
                    </Button>
                  </div>

                  {!sessionState?.activePlaylistUrl && (
                    <p className="text-xs text-muted-foreground italic text-center opacity-70">
                      ↑ Choisissez une playlist d'abord
                    </p>
                  )}

                  {isInBroadcast && (
                    <div className="text-xs text-muted-foreground text-center">
                      <Users className="h-3 w-3 inline mr-1" />
                      {participants.length} participant{participants.length > 1 ? 's' : ''} connecté{participants.length > 1 ? 's' : ''}
                    </div>
                  )}

                </CardContent>
              </Card>

              {showSubtitles && (
                <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdminView}
                  sessionId={sessionId} sessionState={sessionState} />
              )}
            </div>

          ) : (

            // ── INTERFACE CLIENT ──────────────────────────────────────────────
            <div className="space-y-3">
              <Card className="p-4 bg-accent/5 border-accent/20 rounded-2xl">
                <h3 className="font-headline text-base mb-1.5 text-accent italic">L'Espace Sacré</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Utilisez vos <strong>écouteurs</strong> pour une immersion totale.
                  {isInBroadcast && <><br /><br />La musique de soin vous est diffusée.</>}
                  {clientIntroPlaying && <><br /><span className="text-accent text-xs">♪ Introduction en cours...</span></>}
                </p>
              </Card>

              {isInBroadcast && (
                <Card className="p-3 border-accent/20 rounded-2xl space-y-2">
                  {!clientCameraActive ? (
                    <Button onClick={startClientCamera} variant="outline" size="sm"
                      className="w-full" disabled={isSFUConnecting}>
                      {isSFUConnecting
                        ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Connexion...</>
                        : <><Video className="h-3 w-3 mr-2" /> Activer ma caméra</>
                      }
                    </Button>
                  ) : (
                    <Button onClick={() => { stopClientCamera(); unpublishCamera(); }}
                      variant="outline" size="sm" className="w-full text-muted-foreground">
                      <Video className="h-3 w-3 mr-2" /> Désactiver ma caméra
                    </Button>
                  )}
                  {sfuError && <p className="text-xs text-destructive">{sfuError}</p>}
                </Card>
              )}

              {showSubtitles && (
                <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdminView}
                  sessionId={sessionId} sessionState={sessionState} />
              )}
            </div>
          )}
        </div>

        {user && sessionState && (
          <TestimonialModal
            isOpen={isTestimonialModalOpen}
            onClose={() => { setTestimonialModalOpen(false); router.push(`/${lang}/dashboard`); }}
            bookingId={sessionState.id} userId={user.uid}
          />
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-3 py-4 flex-grow flex flex-col">
      {renderContent()}
    </div>
  );
}